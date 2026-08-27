+++
title = "ECS Security Group"
weight = 5
+++
# 安全组 IP 自动更新

## 背景

72602-minipc 的 ISP 不定期更换公网 IP，而阿里云 ECS (ecs-99) 安全组限制了 SSH 端口只能从特定 IP 访问。

当公网 IP 变化时：
- SSH 反向隧道断开
- 无法通过 `ssh aaron@47.110.67.161 -p 10022` 访问
- 无法直接 `ssh root@47.110.67.161`

## 解决方案

定时检测公网 IP，变化时自动更新阿里云安全组规则。

`72602-minipc` 是本页安全组与 AliDNS 维护的主执行入口。ZJLAB 上另有一套
独立的用户级 updater，只维护 ZJLAB 出口来源的安全组白名单；两套脚本的端口
集合、部署层级和运行时配置不同，不能互相覆盖。安全组的端口角色由 ECS
隧道拓扑决定，脚本只维护已登记出口 IP 的来源白名单，不改变端口归属。

## 工作原理

```
每 5 分钟 ──> 获取公网 IPv4 (curl -4，按固定顺序逐个 fallback)
                  │
                  ├── 全部失败 ──> 写入 journald，不推进缓存，不更新安全组
                  │
                  └── 获取成功 ──> 校验返回内容是合法 IPv4
                                       │
                                       ├── 校验失败 ──> 写入 journald，不推进缓存
                                       │
                                       └── 通过校验 ──> 仅与已记录的成功结果对比
                                                          （最多每 3 天落一次成功心跳）
                                                          │
                                                          ├── 未变化 ──> 推进成功心跳缓存，退出
                                                          └── 已变化 ──> 更新安全组规则
                                                                              │
                                                                              └── 仅阿里云 API 真正成功
                                                                                  才推进成功心跳缓存
                                                                                  并发出通知
```

公网 IP 探测使用 `curl -4` 并在 3 个固定 endpoint 间按顺序 fallback，每个 endpoint 内有限重试；返回内容必须通过 IPv4 校验才被采纳。脚本的副作用总是先记入 `journald`；只有「阿里云安全组 API 调用真正成功」才会推进成功心跳缓存。这样即使 IP 检测暂时稳定也不会被回写为成功的安全组更新。

## 受影响的端口

| 端口 | 用途 |
|------|------|
| 22 | ECS SSH 管理连接，以及两个环境建立反向隧道时使用的 ECS sshd 入口 |
| 10021 | 72602-minipc 主 SSH 反向隧道（公网、来源受限） |
| 10022 | 72602-minipc 备 SSH 反向隧道；同时承载 Mailu loopback forwards（公网、来源受限） |
| 51820/UDP | WireGuard Web 数据通道（仅允许当前 72602 公网出口 IP） |

## 文件位置

| 文件 | 说明 |
|------|------|
| `/home/aaron/bin/update-sg-ip.sh` | 各主机的运行时脚本（`0755`，仅属主可写；端口集合按主机区分） |
| `/home/aaron/.aliyun-keys` | 阿里云 AccessKey（`0600`，仅属主可读写） |
| `/etc/systemd/system/update-sg-ip.service` | 72602 系统级 systemd service（`User=aaron`） |
| `/etc/systemd/system/update-sg-ip.timer` | 72602 系统级 systemd timer（`OnBootSec=30`、`OnUnitActiveSec=5min`、`Persistent=true`） |
| `/home/aaron/.config/systemd/user/update-sg-ip.service` | ZJLAB 用户级 systemd service |
| `/home/aaron/.config/systemd/user/update-sg-ip.timer` | ZJLAB 用户级 systemd timer（`OnUnitActiveSec=5min`、`Persistent=true`，链接位于 `timers.target.wants`） |
| `/home/aaron/.local/state/update-sg-ip/` | 持久状态目录：最近已知 IP 与最多每 3 天一次的「成功心跳」 |
| `update-sg-ip.service` / `update-sg-ip.timer` 的 `journald` | 失败原因、API 退出码、是否推进缓存等副作用日志 |

`/tmp` 下不再保留持久状态；断电或重启后历史只在持久目录里。

## Live 部署快照（已核实事实；2026-08-13 审计，动态状态需 live verify）

72602 live：系统级 updater 当前维护 TCP `22`、`10021`、`10022` 以及
WireGuard UDP `51820`。这段端口集合以 `72602-minipc` 上的 live 脚本为准，
不要用 ZJLAB 或仓库模板直接覆盖：

- `update-sg-ip.service` 与 `update-sg-ip.timer` 已部署在
  `/etc/systemd/system/`；`User=aaron`。
- timer 配置：`OnBootSec=30`、`OnUnitActiveSec=5min`、`Persistent=true`。
- 已执行 `daemon-reload`；`systemctl status update-sg-ip.timer` 处于
  `active (waiting)`；手动运行 `update-sg-ip.service` 一次成功。
- 脚本 `/home/aaron/bin/update-sg-ip.sh` 权限 `0755`；持久状态目录
  `/home/aaron/.local/state/update-sg-ip/`。

ZJLAB 与仓库模板：ZJLAB 上的同名用户级 updater，以及本仓库私有模板，当前
只维护 TCP `22`、`10021`、`10022`，不维护 UDP `51820`。两套脚本虽然文件名
相同，但端口集合、部署层级和运行时凭据来源不同；同步或恢复前必须按目标主机
逐项审阅，不能互相替换。

ZJLAB live：

- 用户级 `~/.config/systemd/user/update-sg-ip.service` 与 `.timer`
  已写入；`timers.target.wants/` 下存在 enabled 链接。
- timer 调度与 72602 相同（`OnUnitActiveSec=5min`、`Persistent=true`）。
- 脚本 `/home/aaron/bin/update-sg-ip.sh` 权限 `0755`；持久状态目录
  `/home/aaron/.local/state/update-sg-ip/`。
- 脚本在本地 `systemd-analyze verify` 通过；本批次变更未修改 user unit 文件，
  也未对其执行 `daemon-reload`。
- **当前非交互 SSH 通道下无法确认 ZJLAB user manager 是否处于 active；不要把它写成已 active 的事实。**

## 安全组规则 Description 归属（已核实）

本次仅按 `ModifySecurityGroupRule` 在 ECS 控制台原地改写 `Description` 字段；协议、端口、CIDR、优先级、Policy、Direction 均未变更，未使用 `RevokeSecurityGroup` + `AuthorizeSecurityGroup` 组合。本节不出现 RuleId、真实 IP 或备份绝对路径。

当前自动更新器在 ECS 上以如下 `Description` 识别自己负责的规则：

| 脚本 | Description | 负责的协议/端口 |
|------|-------------|-----------------|
| `update-sg-ip-72602-minipc` | `update-sg-ip-72602-minipc` | 72602-minipc live updater 自动更新 TCP `22` / `10021` / `10022` 和 UDP `51820` |
| `update-sg-ip-zjlab` | `update-sg-ip-zjlab` | ZJLAB 出口来源的 TCP `22` / `10021` / `10022` 白名单；ZJLAB 的 `10023` / `10024` 仍为 ECS loopback-only listener，不应有公网规则 |

迁移与兼容要点（已核实）：

- 旧的 `zjlab-ubuntu-SSH` 目标规则当前已迁移为新 Description（`update-sg-ip-zjlab`），新写入按新 Description 归属。
- 此前遗留的 8 条 `auto-updated-ip` 规则已经逐条审计并清理：无法证明仍在使用的历史来源已删除；仍有连接证据的 72602/ZJLAB 来源规则改为对应的新 Description；仅绑定 ECS loopback 的 `10023` / `10024` 规则也已删除。当前 live 安全组中 `auto-updated-ip` 为 0 条。当前 `10023` / `10024` 不属于公网访问面。
- 72602 live 脚本后续新增规则统一使用新 Description 写入，再按 Description 归属做替换与去重。

排障/审计提示：

- 描述归属是审计依据，但**不是**访问控制字段；脚本仍只按来源 IP 维度做替换与去重，不依赖 Description 进行授权判定。
- 调整 Description 不会改变 `ModifySecurityGroupRule` 调用语义；若要恢复旧描述或回退历史规则，请先在 ECS 控制台人工确认目标 RuleId 当前的协议/端口/CIDR/优先级/Policy/Direction，再按原值 `ModifySecurityGroupRule` 回写 Description。
- 后续如再次出现未知来源或旧 Description 规则，不应仅凭名称自动删除；必须先核对协议、端口、CIDR、优先级、Policy、Direction，以及 ECS 监听和连接日志，再按 RuleId 原地迁移或删除。

## 可恢复备份

脱敏后的可恢复备份位于私有仓库 `ops-private` 的隐私目录，包含 `scripts/update-sg-ip.sh`、两套 systemd unit 的样例、`env.example` 及对应的 Markdown runbook；提交不包含 AccessKey、钉钉 token 或真实安全组 ID。绝对路径仅保留在 `ops-private` 内部，本页不复述。

备份操作不会触碰现网脚本、systemd units 或 timer；只有在显式授权下才把备份还原回现网路径。

## AliDNS 环境

- 官方 AliDNS SDK 使用独立虚拟环境 `/home/aaron/.local/venvs/alidns`。
- SDK 或依赖需要下载时，使用 HTTP 代理 `http://192.168.0.25:17890`。
- 当前凭证具备 `72602.space` 区域的 AliDNS 记录管理能力，也具备 ECS 安全组变更能力。
- DNS 变更前应限定目标区域和记录，并在变更后分别执行权威 DNS 与公共 DNS 验证。

## 常用命令

72602 系统级（从 `72602-minipc` 执行）：

```bash
# 查看定时器状态
systemctl status update-sg-ip.timer

# 手动触发一次更新
sudo systemctl start update-sg-ip.service

# 查看执行日志
journalctl -u update-sg-ip.service -f

# 手动运行脚本
~/bin/update-sg-ip.sh

# 查看持久状态（最近已知 IP、成功心跳时间戳等）
ls -l /home/aaron/.local/state/update-sg-ip/
```

ZJLAB 用户级（从非交互通道；`enable-linger` 状态需另行确认）：

```bash
# 查看用户级定时器
systemctl --user status update-sg-ip.timer

# 手动触发一次更新
systemctl --user start update-sg-ip.service

# 查看执行日志
journalctl --user -u update-sg-ip.service -f
```

## 钉钉通知

脚本支持钉钉通知。`ops-private` 恢复模板要求从 mode `0600` 的运行时凭据
文件或环境占位符读取通知配置，变量值不应出现在版本控制、日志或本页面里。
2026-08-13 审计发现 72602 live `/home/aaron/bin/update-sg-ip.sh` 与仓库模板
不一致并包含内嵌的钉钉运行时配置/凭据；本次未输出、复制或修改这些值。后续
应在维护窗口迁移到受权限保护的凭据文件并轮换旧凭据，不能把 live 脚本直接
复制回仓库。

通知端到端送达（钉钉服务器 → 群）无法从主机单独证明。已核实的层面仅是「脚本进入了成功发送路径」：

- 72602：HTTP 层返回成功。
- ZJLAB：当前仅能确认请求进入了成功发送路径，无法断言到达对端。

## 凭证安全

阿里云 AccessKey 存储在 `/home/aaron/.aliyun-keys`，权限 `0600`。当前同一 AccessKey 同时具备 ECS 安全组和 AliDNS 变更权限；后续应拆分为两个最小权限 RAM 身份。AccessKey 获取：阿里云控制台 → 头像 → AccessKey 管理。建议定期轮换。

`/home/aaron/bin/update-sg-ip.sh` 权限已为 `0755`，仅属主可写，与本次脚本行为保持一致。

## 排障与验证

依次用下面命令定位问题，每一步都不会改动远端：

```bash
# 1. systemd 单元是否加载、timer 是否 active/waiting
systemctl status update-sg-ip.timer
# 2. 最近一次运行的输出与退出码
sudo journalctl -u update-sg-ip.service -n 200 --no-pager
# 3. 公网 IPv4 获取是否仍正常（独立于 systemd）
curl -4 --max-time 5 -s https://ifconfig.me; echo
curl -4 --max-time 5 -s https://ip.sb; echo
curl -4 --max-time 5 -s https://icanhazip.com; echo
# 4. 当前持久状态与上次「成功心跳」时间戳
stat -c '%n %y' /home/aaron/.local/state/update-sg-ip/*
```

判定要点：

- 如果定时器未处于 `active (waiting)`，先看 `journalctl` 里是否含单元语法/路径错误；不要直接重写 unit，先核对 `systemd-analyze verify`。
- 如果 IPv4 全部失败，证实问题在出网路径而非本脚本；优先检查 ISP 与 `192.168.0.25:17890` 代理。
- 如果 journald 显示「更新安全组失败」，需要看阿里云 API 退出码；但**不应**凭此推进成功心跳缓存，避免下次循环误判无变化。

## 回滚原则

回滚的目标只是把 unit、timer、脚本或状态目录恢复到上一份已审核版本，**不应**回滚阿里云安全组规则的远端状态，也**不应**暴露任何备份的绝对路径。

一般顺序：

1. `systemctl stop update-sg-ip.timer`（必要时连同 `.service`），冻结调度。
2. 从 `ops-private` 隐私目录取出对应文件原样覆盖到现网路径，并恢复属主 `aaron` 与原权限（`0755`）。
3. `systemctl daemon-reload`（系统级）或 `systemctl --user daemon-reload`（用户级）。
4. 重启 timer 并通过 `systemctl status` 与 `journalctl` 复核 unit 已被识别。
5. 安全组规则若需手动恢复到旧的允许 IP，应通过 `ops-private` 内的官方 AliDNS / 阿里云 SDK 流程，不在本页复述参数。

如果回滚过程中发现脚本逻辑本身可疑，先保留旧的 systemd unit 与旧脚本，把问题记到新 issue 而不是就地修改 live 脚本。

## 紧急临时访问设计（尚未部署）

当前安全组只允许已登记的 72602 与 ZJLAB 出口来源访问 ECS 的 TCP `22`、
`10021`、`10022`；端口用途仍分别由 72602 主/备入口和 ECS sshd 决定。ZJLAB
的 `10023` / `10024` 监听器仅在 ECS loopback 上提供 ProxyJump 目标，不应通过
安全组公开。紧急访问不建议使用无认证的传统端口敲门序列；序列可被监听、重放
或扫描。推荐使用一个独立的、仅密钥认证的 SSH gate：

1. ECS 单独监听一个 gate 端口，例如 TCP `2222`；该端口只允许专用用户 `sg-gate`，不提供 shell、PTY、端口转发或 Agent forwarding。
2. `sg-gate` 只接受一把独立的、带密码短语的 emergency key。认证成功后由 forced command 读取 `SSH_CONNECTION` 的实际来源 IP，不接受用户自行传入任意 IP。
3. 默认只为该来源 IP 添加 TCP `22` 的 `/32` 临时规则，Description 使用 `emergency-ssh-<request-id>`；如确实要访问 72602 反向入口，必须显式选择只包含 `10021` / `10022` 的 tunnel profile，不默认开放，也不得选择 `10023` / `10024`。
4. 临时授权最大有效期固定为 3600 秒。授权器保存 RuleId、来源、端口和 UTC 到期时间；root-only 的过期任务每分钟扫描并按 RuleId 删除，重启后先执行一次过期清理。删除失败必须重试并告警，不能只依赖启动授权的 SSH 会话。
5. 授权、续期和删除都要记录审计日志；重复请求不得创建重复规则。用户 IP 发生变化时，必须从新 IP 重新执行 gate。

用户侧操作流程（部署后）：

```bash
# 1. 用独立 emergency key 认证 gate；源 IP 由 ECS 自动识别
ssh -p 2222 -i ~/.ssh/ecs-emergency-gate sg-gate@47.110.67.161 grant

# 2. 使用原来的 ECS 管理 key 连接真正的 SSH 服务
ssh -i ~/.ssh/ecs-admin root@47.110.67.161
```

这个流程需要一个独立的云端控制路径。若授权器放在 ECS 上，必须使用只允许目标安全组读取、添加和删除规则的独立 RAM 身份，凭据仅由 root 读取，不能复用当前同时拥有 AliDNS 权限的主密钥。若坚持所有云变更只从 72602-minipc 发起，则 gate 可以通过现有反向隧道请求 minipc 执行，但 72602 与 ECS 的桥梁同时中断时紧急入口也会失效，不能满足真正的灾备目标。

传统 `knockd` 端口序列可以作为低成本触发器，但不应作为唯一认证。若不开放独立 SSH gate，可改用带时间戳、随机数和 MAC 的 SPA（例如 fwknop）触发同一个授权器；无论采用哪种触发方式，云端规则都必须由持久过期任务按 RuleId 删除。

该设计目前仅记录方案，尚未开放 gate 端口、创建 emergency key、创建 RAM 身份或部署授权器。

## Recent Operations

### 2026-08-13: ZJLAB egress-IP incident

- ZJLAB 的 Internet 出口 IPv4 发生变化，ECS 安全组的 TCP `22` 来源白名单
  未及时匹配新地址。
- 两条独立的 ZJLAB reverse SSH session 因无法通过 ECS sshd 建立而同时失效；
  ECS 侧监控随后对 `primary` 和 `backup` 报告 `ssh_banner_failed`。
- 处理顺序应是先确认当前 ZJLAB 出口 IPv4、ECS 安全组 TCP `22` allowlist、
  ECS 防火墙和 sshd，再检查已建立的 SSH child/session、loopback listener
  和 banner。不要把两个同时告警直接判断为端口映射改变或两套服务必然同时
  崩溃。

### 2026-08-11: approved ECS security-group cleanup

- The operation ran through the approved `72602-minipc` SSH path. Both ECS
  reverse-tunnel entry points (`10021` and `10022`) authenticated successfully
  and returned `72602-minipc`. The official ECS SDK was run on that host in
  `cn-hangzhou`; no credential value was printed. A host-local redacted
  rollback record was created with mode `0600` before mutation.
- `ModifySecurityGroupRule` changed only the Description of the three
  `39.170.58.206/32` TCP rules for `22`, `10021`, and `10022` from
  `auto-updated-ip` to `update-sg-ip-zjlab`. Protocol, port, source, policy,
  priority, and direction were unchanged.
- By exact RuleId, with a fresh Describe verification after each deletion, the
  following were removed: the `36.24.59.216/32` TCP `22`/`10021`/`10022`
  rules; the `39.170.58.206/32` TCP `10023`/`10024` rules; the
  `47.110.67.161/32` TCP `10021`/`10022` rules owned by
  `update-sg-ip-zjlab`; and the `0.0.0.0/0` TCP `22` system-created rule.
  The live Description of the final rule included a trailing period and was
  matched by its RuleId after Describe. No unrelated port rule was changed.
- Final Describe confirmed that TCP `22`, `10021`, and `10022` have only
  `36.24.58.213/32` (`update-sg-ip-72602-minipc`) and
  `39.170.58.206/32` (`update-sg-ip-zjlab`). TCP `10023` and `10024` have no
  public security-group rule. The final ingress rule count was `17`.
- IPv4 checks through `ifconfig.me`, `ip.sb`, and `icanhazip.com` all returned
  `36.24.58.213`. The 72602 `update-sg-ip.timer` remained enabled and
  `active (waiting)`. The rollback is to review the current fields and restore
  only the recorded deleted rules or revert the three descriptions through the
  official ECS SDK; do not restore public `10023`/`10024` rules.
