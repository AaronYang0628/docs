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

所有阿里云安全组和 AliDNS 操作统一从 `72602-minipc` 执行。

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
| 22 | ECS SSH 直接连接、反向隧道 |
| 10021 | 预留 |
| 10022 | SSH 反向隧道（72602-minipc 入口） |

## 文件位置

| 文件 | 说明 |
|------|------|
| `/home/aaron/bin/update-sg-ip.sh` | 主脚本（`0755`，仅属主可写） |
| `/home/aaron/.aliyun-keys` | 阿里云 AccessKey（`0600`，仅属主可读写） |
| `/etc/systemd/system/update-sg-ip.service` | 72602 系统级 systemd service（`User=aaron`） |
| `/etc/systemd/system/update-sg-ip.timer` | 72602 系统级 systemd timer（`OnBootSec=30`、`OnUnitActiveSec=5min`、`Persistent=true`） |
| `/home/aaron/.config/systemd/user/update-sg-ip.service` | ZJLAB 用户级 systemd service |
| `/home/aaron/.config/systemd/user/update-sg-ip.timer` | ZJLAB 用户级 systemd timer（`OnUnitActiveSec=5min`、`Persistent=true`，链接位于 `timers.target.wants`） |
| `/home/aaron/.local/state/update-sg-ip/` | 持久状态目录：最近已知 IP 与最多每 3 天一次的「成功心跳」 |
| `update-sg-ip.service` / `update-sg-ip.timer` 的 `journald` | 失败原因、API 退出码、是否推进缓存等副作用日志 |

`/tmp` 下不再保留持久状态；断电或重启后历史只在持久目录里。

## Live 部署快照（已核实事实）

72602 live：

- `update-sg-ip.service` 与 `update-sg-ip.timer` 已部署在
  `/etc/systemd/system/`；`User=aaron`。
- timer 配置：`OnBootSec=30`、`OnUnitActiveSec=5min`、`Persistent=true`。
- 已执行 `daemon-reload`；`systemctl status update-sg-ip.timer` 处于
  `active (waiting)`；手动运行 `update-sg-ip.service` 一次成功。
- 脚本 `/home/aaron/bin/update-sg-ip.sh` 权限 `0755`；持久状态目录
  `/home/aaron/.local/state/update-sg-ip/`。

ZJLAB live：

- 用户级 `~/.config/systemd/user/update-sg-ip.service` 与 `.timer`
  已写入；`timers.target.wants/` 下存在 enabled 链接。
- timer 调度与 72602 相同（`OnUnitActiveSec=5min`、`Persistent=true`）。
- 脚本 `/home/aaron/bin/update-sg-ip.sh` 权限 `0755`；持久状态目录
  `/home/aaron/.local/state/update-sg-ip/`。
- 脚本在本地 `systemd-analyze verify` 通过；本批次变更未修改 user unit 文件，
  也未对其执行 `daemon-reload`。
- **当前非交互 SSH 通道下无法确认 ZJLAB user manager 是否处于 active；不要把它写成已 active 的事实。**

## 可恢复备份

脱敏后的可恢复备份位于私有仓库 `ops-private` 的隐私目录，包含 `scripts/update-sg-ip.sh`、两套 systemd unit 的样例、`env.example` 及对应的 Markdown runbook；提交不包含 AccessKey、钉钉 token 或真实安全组 ID。绝对路径仅保留在 `ops-private` 内部，本页不复述。

备份操作不会触碰现网脚本、systemd units 或 timer；只有在显式授权下才把备份还原回现网路径。

## AliDNS 环境

- 官方 AliDNS SDK 使用独立虚拟环境 `/home/aaron/.local/venvs/alidns`。
- SDK 或依赖需要下载时，使用 HTTP 代理 `http://192.168.0.25:17890`。
- 当前凭证具备 `72602.online` 区域的 AliDNS 记录管理能力，也具备 ECS 安全组变更能力。
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

脚本支持钉钉机器人通知。需要设置 `DING_TOKEN` 环境变量或在脚本中维护对应变量；变量值不应出现在版本控制、日志或本页面里。`~/.aliyun-keys` 仅用于阿里云 AccessKey，不应用来存放钉钉凭据。

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
