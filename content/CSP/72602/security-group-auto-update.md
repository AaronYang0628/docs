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

定时检测公网 IP，变化时统一协调两处 consumer：阿里云 ECS 安全组的 TCP
`22` / `10021` / `10022` 与 UDP `51820` 规则，以及 ECS 本机 UFW 的
`51820/udp` 规则（comment `wg 72602-minipc`）。所有云端写操作统一从
`72602-minipc` 上的同一个 5 分钟 systemd timer 发起；ECS 上只放一个最小化、
root-only 的 forced-command 助手负责 UFW 这一侧。

## 工作原理

统一的动态 IP 协调器只跑在 `72602-minipc` 上的一个 5 分钟 systemd timer
（`update-sg-ip.timer` / `update-sg-ip.service`）。每次执行都用 `flock`
串行化，保证同一时刻只有一个进程推进状态：

```
每 5 分钟 ──> flock 串行化
                  │
                  └── 获取公网 IPv4 (curl -4，按固定顺序逐个 fallback)
                          │
                          ├── 全部失败 ──> 写入 journald，不推进状态
                          │
                          └── 获取成功 ──> 校验返回内容是合法 IPv4
                                               │
                                               ├── 校验失败 ──> 写入 journald，不推进状态
                                               │
                                               └── 通过校验 ──> 仅与已记录的「两端都已核实」结果对比
                                                                  │
                                                                  ├── 未变化 ──> 退出，不动 SG / UFW / 状态
                                                                  └── 已变化 ──> 进入「先建新、再验证、后清理」
                                                                                    │
                                                                                    1. 通过 Aliyun SDK 在安全组内写入新 /32
                                                                                       （TCP 22 / 10021 / 10022 与 UDP 51820）
                                                                                    2. 通过专用受限 SSH key（路径仅运行时存在）
                                                                                       以 root 身份调用 ECS 端的 forced-command 助手
                                                                                       /usr/local/sbin/72602-wireguard-ufw-reconcile
                                                                                       仅调整 `51820/udp` 的 UFW 规则
                                                                                       （comment `wg 72602-minipc`）
                                                                                    3. 两个 consumer（Aliyun SG 与 ECS UFW）都验证生效后
                                                                                       才写入持久状态并清理旧的 updater-owned 规则
                                                                                    │
                                                                                    └── 任意一步失败 ──> 新规则保留，
                                                                                                        旧 managed 规则不删除；
                                                                                                        下一次重试幂等
```

公网 IP 探测使用 `curl -4`、有限重试和五个固定 endpoint：保留的
`ifconfig.me`、`ip.sb`、`icanhazip.com`，以及现场验证通过的
`ifconfig.co/ip`、`ipinfo.io/ip`。脚本会收集全部结果；至少两个 endpoint 返回
相同的合法 IPv4 才会被采纳。单个结果或全失败都只写入 `journald`，不修改云
安全组、不推进缓存，并记录各 endpoint 的阶段性错误或结果。

探测失败使用持久的连续失败计数：达到三次才尝试一次
`[ZJLAB] public IPv4 detection failed` 通知，失败期间不重复刷屏；quorum 恢复
后只尝试一次恢复通知。通知失败不改变任务退出判断。成功 heartbeat 仍保持三天
一次，失败计数与告警状态文件位于现有持久状态目录且权限为 `0600`。

## 受影响的端口

| 端口 | 协调器写入的位置 | 由谁验证 |
|------|----------------|----------|
| TCP `22` | Aliyun 安全组 `/32` 规则 | `update-sg-ip.service` 通过 Aliyun SDK 描述与对比验证 |
| TCP `10021` | Aliyun 安全组 `/32` 规则 | `update-sg-ip.service` 通过 Aliyun SDK 描述与对比验证 |
| TCP `10022` | Aliyun 安全组 `/32` 规则 | `update-sg-ip.service` 通过 Aliyun SDK 描述与对比验证 |
| UDP `51820` | Aliyun 安全组 `/32` 规则 + ECS UFW `/32` 规则（comment `wg 72602-minipc`） | Aliyun SDK 与 ECS UFW helper 两侧都需要「先建新 + 验证生效」才算落地 |

UDP `51820` 是「双 consumer」：Aliyun 安全组由 `update-sg-ip.service` 写入；ECS
本机的 UFW 规则由 `update-sg-ip.service` 通过专用受限 SSH key 调用 ECS 上
root-only 的 forced-command 助手调整。两个 consumer 都验证生效后，协调器才
清理旧的 updater-owned 规则并落盘持久状态。任意一侧失败都会让新规则保留、
旧 managed 规则保留到下一次重试，重试本身幂等。

## 双 consumer 协调与安全的部分失败

UDP `51820` 在公网路径上有两层入口：阿里云安全组的 `/32` 规则（云端边界）
和 ECS 本机 UFW 的 `/32` 规则（实例边界）。只更新其中一层，WireGuard 数据
通道仍可能在另一层被丢包，因此协调器把两者视作一个事务来推进：

1. **先建新规则**：协调器先按 Description `update-sg-ip-72602-minipc` 在
   Aliyun 安全组中写入新 `/32`，并通过 SSH 调用 ECS 上的
   `72602-wireguard-ufw-reconcile` 在 UFW 中加入新 `/32`（comment
   `wg 72602-minipc`）。
2. **两边都验证**：协调器再次描述安全组、再次触发 UFW helper 的 status
   输出，确认两条新规则都已经落地并匹配当前探测到的公网 IP。
3. **再清理旧规则**：两侧验证都通过后才删除旧 updater-owned 规则，再把
   「最近已知 IP + 上一次双 consumer 已核实时间戳」写入持久状态目录。
4. **失败回退**：只要任意一侧验证失败，协调器就立刻退出，不删除旧规则、
   不推进持久状态。新规则保留，下一个 5 分钟周期由协调器幂等重试。

这一顺序保证了三件事：

- 新 IP 在协调器认为「完成」之前已经可以同时被云端与本机接受，新规则一旦
  落地就不会再被回滚。
- 旧 IP 的访问能力在协调失败时仍然保留，下一次重试会先再次验证新规则、
  再尝试清理旧规则，不会出现「只删了旧规则、新规则又没建好」的窗口。
- 整个流程不依赖任何单一调用方的成功响应；任意一次调用失败都不会破坏
  协调器与两个 consumer 之间的一致性。

协调器本身是幂等的：Aliyun SDK 写入同 Description / 同 `/32` 是修改语义，
不会复制规则；UFW 助手按 comment 识别自己负责的规则，重复调用也是修改或
去重，不会复制条目。因此 `systemctl start update-sg-ip.service` 在五分钟
周期之外被手动触发不会引入脏状态。

## 文件位置

协调器的所有持久组件都落在 `72602-minipc` 的 `aaron` 用户下；ECS 上只放一个
最小化、root-only 的 forced-command 助手。本页不复述任何运行时密钥或
AccessKey 的实际路径。

| 文件 / 资源 | 说明 |
|-------------|------|
| `/home/aaron/bin/update-sg-ip.sh` | 协调器主脚本（`0755`，仅属主可写）；使用 `flock` 串行化并调用 `/home/aaron/.local/venvs/alidns/bin/python` 跑官方 Aliyun ECS / VPC SDK |
| `/home/aaron/.local/venvs/alidns/bin/python` | 官方 Aliyun ECS / VPC SDK 的 approved virtualenv；当前脚本通过它发请求，不再使用系统 Python |
| `/home/aaron/.aliyun-keys` | 阿里云 AccessKey（`0600`，仅属主可读写），在 SDK 进程内被 source；当前同时具备 ECS 安全组和 AliDNS 权限，后续应拆分为最小权限 RAM 身份 |
| `/etc/systemd/system/update-sg-ip.service` | 72602 系统级 systemd service（`User=aaron`） |
| `/etc/systemd/system/update-sg-ip.timer` | 72602 系统级 systemd timer（`OnBootSec=30`、`OnUnitActiveSec=5min`、`Persistent=true`）；唯一调度源 |
| `/home/aaron/.config/systemd/user/update-sg-ip.service` | ZJLAB 用户级 systemd service |
| `/home/aaron/.config/systemd/user/update-sg-ip.timer` | ZJLAB 用户级 systemd timer（`OnUnitActiveSec=5min`、`Persistent=true`，链接位于 `timers.target.wants`） |
| `/home/aaron/.local/state/update-sg-ip/` | 持久状态目录：最近已知 IP、上一次「两端都已核实」的时间戳、连续探测失败计数与告警状态；状态文件 `0600`，仅属主可读写 |
| `update-sg-ip.service` / `update-sg-ip.timer` 的 `journald` | 失败原因、API 退出码、是否推进状态等副作用日志 |
| `/usr/local/sbin/72602-wireguard-ufw-reconcile` | ECS 上 root-only forced-command 助手；只接受来自专用受限 SSH key 的连接，仅调整 `51820/udp` UFW 规则（comment `wg 72602-minipc`），不开放 shell / port forwarding；源 IP 取自 ECS 上看到的实际 `SSH_CONNECTION` |
| ECS 端的专用受限 SSH key | 路径与权限仅在运行时存在；本页面与版本控制都不复述绝对路径 |

`/tmp` 下不再保留持久状态；断电或重启后历史只在持久目录里。安全组的旧
`Description` 归属（`auto-updated-ip`）早已下线，新的 updater-owned 规则一律
按 `update-sg-ip-72602-minipc` / `update-sg-ip-zjlab` 描述字段识别。

## Live 部署快照（已核实事实；2026-08-13 审计，动态状态需 live verify）

72602 live（2026-08-16 21:29 +08 观察点）：

- `update-sg-ip.service` 与 `update-sg-ip.timer` 已部署在
  `/etc/systemd/system/`；`User=aaron`。
- timer 配置：`OnBootSec=30`、`OnUnitActiveSec=5min`、`Persistent=true`，
  当前唯一调度源。
- 已执行 `daemon-reload`；`systemctl status update-sg-ip.timer` 处于
  `active (waiting)`；手动运行 `update-sg-ip.service` 一次成功。
- 脚本 `/home/aaron/bin/update-sg-ip.sh` 权限 `0755`，使用 `flock` 串行化；
  当前通过 approved virtualenv `/home/aaron/.local/venvs/alidns/bin/python`
  调起官方 Aliyun ECS / VPC SDK，不再走系统 Python。
- 持久状态目录 `/home/aaron/.local/state/update-sg-ip/`，文件 `0600`。
- ECS 上的 root-only forced-command 助手
  `/usr/local/sbin/72602-wireguard-ufw-reconcile` 已部署，仅调整 `51820/udp`
  的 UFW 规则（comment `wg 72602-minipc`），仅接受来自专用受限 SSH key 的
  forced-command 调用，不开放 shell / port forwarding / Agent forwarding；
  该 SSH key 的私钥路径与权限仅运行时存在，文档不公开。
- 当前观察到的 72602-minipc 公网 IPv4 为 `122.231.144.126`，但这只是某一次
  观察点，不应作为永久期望值；任何「当前公网 IP 应为 X」的判断都要重新探测
  后再写。
- WireGuard handshake fresh，HAProxy 正常服务 minipc_wg，SSH Web 备份路径
  健康；公网 `port.72602.space` 与 `ops.docs.72602.space` 均为 HTTP `200`、
  TLS 校验通过。

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
- 脚本通过 `bash -n`；两个 user unit 通过 `systemd-analyze verify`。本批次变更
  未修改 user unit 文件，也未对其执行 `daemon-reload`。
- 当前 user timer 为 `enabled`、`active (waiting)`，仍按五分钟调度；非交互 SSH
  需要设置用户运行时目录后才能连接 user manager。

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

# 查看持久状态（最近已知 IP、上一次「两端都已核实」的时间戳等）
ls -l /home/aaron/.local/state/update-sg-ip/

# 检查 approved virtualenv
ls -l /home/aaron/.local/venvs/alidns/bin/python

# 验证 ECS 端的 UFW 规则与 helper 一致（只读）
ssh root@47.110.67.161 'sudo ufw status | grep -E "51820/udp|wg 72602-minipc"'
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

只有在「两端都已核实」之后，通知才会被发出；单边成功（SG 写入成功但 UFW 助手失败，或反之）不构成成功完成。

## 凭证安全

阿里云 AccessKey 存储在 `/home/aaron/.aliyun-keys`，权限 `0600`，仅在官方
Aliyun SDK 进程内被 source，绝不打字、复制或写入 Git。当前同一 AccessKey
同时具备 ECS 安全组和 AliDNS 变更权限；后续应拆分为两个最小权限 RAM
身份。AccessKey 获取：阿里云控制台 → 头像 → AccessKey 管理。建议定期轮换。

脚本 `/home/aaron/bin/update-sg-ip.sh` 权限已为 `0755`，仅属主可写。当前
通过 approved virtualenv `/home/aaron/.local/venvs/alidns/bin/python` 调起
官方 SDK（ECS / VPC / AliDNS），不再走系统 Python；依赖下载时仍可走
`http://192.168.0.25:17890` 代理。

ECS 上用于调用 UFW 助手的 SSH key 只授权单一 forced-command
（`/usr/local/sbin/72602-wireguard-ufw-reconcile`），不携带 shell、不支持
端口转发 / Agent forwarding；其私钥路径与权限仅在运行时存在，本页面不复述。

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
# 4. 当前持久状态与上次「两端都已核实」的时间戳
stat -c '%n %y' /home/aaron/.local/state/update-sg-ip/*
# 5. Aliyun 安全组中 updater-owned 规则的实际状态（只读）
#    仅按 Description 过滤，不打印真实 IP/RuleId
ssh root@47.110.67.161 'sudo /usr/local/sbin/72602-wireguard-ufw-reconcile status || true'
# 6. ECS UFW 中 `wg 72602-minipc` 注释规则的实际状态（只读）
ssh root@47.110.67.161 'sudo ufw status | grep "wg 72602-minipc"'
```

判定要点：

- 如果定时器未处于 `active (waiting)`，先看 `journalctl` 里是否含单元语法/路径错误；不要直接重写 unit，先核对 `systemd-analyze verify`。
- 如果 IPv4 全部失败，证实问题在出网路径而非本脚本；优先检查 ISP 与 `192.168.0.25:17890` 代理。
- 如果 journald 显示「安全组写入成功但 UFW 助手失败」或反之，说明只完成了一半 consumer；此时新规则已经生效、旧 managed 规则不会删除，等待下一个 5 分钟周期由协调器重试，不需要立刻手工调整。
- 不要在「两端都已核实」之前手工删除旧 managed 规则；否则下一次 IP 变化会同时出现旧规则缺失 + 新规则被建，造成双 consumer 一致性窗口被绕过。
- 协调器本身是幂等的：每 5 分钟周期都会重新评估，新规则重复写入会被 Aliyun SDK / UFW 助手去重。

## 回滚原则

回滚的目标只是把协调器本身（unit、timer、脚本、approved virtualenv、持久
状态目录、ECS UFW 助手）恢复到上一份已审核版本，**不应**回滚阿里云安全
组或 ECS UFW 远端规则，也**不应**暴露任何备份的绝对路径或 SSH key 路径。
在确认新的协调路径能跑通之前，不要主动删除当前 ECS `22/10021/10022` 或
`51820/udp` 的允许 IP，否则可能把自己从 ECS 端断掉。

一般顺序：

1. `systemctl stop update-sg-ip.timer`（必要时连同 `.service`），冻结调度。
2. 从 `ops-private` 隐私目录取出对应文件原样覆盖到现网路径，并恢复属主 `aaron` 与原权限（脚本 `0755`，虚拟环境与持久状态目录 `0600` / `0700`）。
3. `systemctl daemon-reload`（系统级）或 `systemctl --user daemon-reload`（用户级）。
4. 重启 timer 并通过 `systemctl status` 与 `journalctl` 复核 unit 已被识别。
5. 在 ECS 上复核 `/usr/local/sbin/72602-wireguard-ufw-reconcile` 的版本与权限（root-only、`0700`），确认其 `authorized_keys` 条目仍指向专用受限 key 而非 root 登录 key。
6. 安全组 / UFW 规则若需手动恢复到旧的允许 IP，应通过 `ops-private` 内的官方 AliDNS / 阿里云 SDK 流程，不在本页复述参数。

如果回滚过程中发现协调逻辑本身可疑，先保留旧的 systemd unit 与旧脚本，把
问题记到新 issue 而不是就地修改 live 协调路径。

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

### 2026-08-20: ZJLAB public IPv4 detection quorum and alert debounce

- 通过批准的 `ssh zjlab` 路径修复了 ZJLAB 用户级 updater 的诊断和告警质量。
  旧逻辑按 endpoint 顺序采纳首个成功结果；本次观测到既有 endpoint 在一段时间内
  同时出现连接阶段 `curl 28` 超时，恢复后无需云端动作。
- 保留 `ifconfig.me`、`ip.sb`、`icanhazip.com`，新增并现场验证
  `ifconfig.co/ip`、`ipinfo.io/ip`。现在至少两个 endpoint 返回同一合法 IPv4
  才会推进后续协调；单个或全失败不修改安全组、不推进缓存，并记录 endpoint
  阶段性结果。
- 持久失败计数在连续第三次失败时才尝试一次失败通知，恢复后只尝试一次恢复
  通知；通知失败不改变任务退出判断。成功 heartbeat 仍为三天一次。
- 未修改 Kubernetes、安全组、SSH 隧道、凭据、端口列表或 Description 逻辑。
  脚本保持 `0755`；脚本与两个 user unit 的 `0600` 回滚备份保存在 ZJLAB 用户
  的持久状态目录下，实际备份位置不在本页复述。
- `bash -n`、两个 user unit 的 `systemd-analyze verify` 以及不触发云写 API 的
  受控测试均通过，覆盖 quorum、单结果不足 quorum、全失败、三次失败单告警和
  恢复单通知。

### 2026-08-16: unified 72602 dynamic-IP reconciliation deployed

- 单一 5 分钟 systemd timer（`update-sg-ip.timer` / `update-sg-ip.service`）
  现在统一协调两处 consumer：Aliyun ECS 安全组的 TCP `22` / `10021` /
  `10022` 与 UDP `51820` 规则，以及 ECS 本机 UFW 的 `51820/udp` 规则
  （comment `wg 72602-minipc`）。ZJLAB 上的同名 user timer 仍是各自
  environment 内的独立调度源。
- 协调器使用 `flock` 串行化；通过 approved virtualenv
  `/home/aaron/.local/venvs/alidns/bin/python` 调起官方 Aliyun ECS /
  VPC SDK，不再走系统 Python。脚本本身仍位于 `/home/aaron/bin/update-sg-ip.sh`
  （`0755`）。
- ECS UFW 这一侧由一个 root-only forced-command 助手
  `/usr/local/sbin/72602-wireguard-ufw-reconcile` 负责；该助手仅调整
  `51820/udp` UFW 规则，仅接受来自专用受限 SSH key 的调用，不开放 shell
  / port forwarding / Agent forwarding，源 IP 取自 ECS 上看到的实际
  `SSH_CONNECTION`。专用 SSH key 的私钥路径与权限仅运行时存在，本页面与
  版本控制都不公开其绝对路径。
- 协调器采用「先建新规则 → 两边分别验证生效 → 再清理旧 updater-owned
  规则并落盘持久状态」的顺序。任意一侧验证失败都会让新规则保留、旧 managed
  规则保留到下一次重试，重试本身幂等；持久状态目录
  `/home/aaron/.local/state/update-sg-ip/` 只在「两端都已核实」之后才推进。
- 验证点（2026-08-16 21:29 +08）：
  - `update-sg-ip.timer` 仍处 `active (waiting)`；
  - 公网 IPv4 探测从 `ifconfig.me` / `ip.sb` / `icanhazip.com` 都返回
    `122.231.144.126`（仅作为该观察点的快照，不作为永久期望值）；
  - ECS UFW 中 `51820/udp` 规则带有 comment `wg 72602-minipc`；
  - WireGuard handshake fresh；HAProxy 正常服务 `minipc_wg`；SSH Web
    backup 路径健康；
  - 公网 `https://port.72602.space/` 与
    `https://ops.docs.72602.space/` 均 HTTP `200` 且 TLS 校验通过。
- 回滚保持通用顺序（停 timer / 从 `ops-private` 取备份覆盖 / daemon-reload
  / 重启 timer），不要先于新路径验证就主动删除 ECS `22/10021/10022` 或
  `51820/udp` 的允许 IP。

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
