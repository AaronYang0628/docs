+++
title = "zjlab-ubuntu → ecs-99"
tags = ["ssh", "tunnel"]
weight = 1
+++

# SSH 反向隧道：zjlab-ubuntu → ecs-99（双入口）

本文档已按当前线上方案更新为双入口：`10023`（主）+ `10024`（备）。

## 一、架构和目标

```text
外网任意机器                          ecs-99 (47.110.67.161)                       zjlab-ubuntu (192.168.31.111)
ssh -p 10023 aaron@47.110.67.161  ->   0.0.0.0:10023 (sshd)   --SSH reverse-->     localhost:22
ssh -p 10024 aaron@47.110.67.161  ->   0.0.0.0:10024 (sshd)   --SSH reverse-->     localhost:22
```

- `10023` 和 `10024` 都由 `zjlab-ubuntu` 主动建立反向隧道到 ECS。
- 两个端口独立 service，避免单 service 故障影响全部入口。
- 10022 发生的掉线场景，同样可能发生在 10023/10024；区别在于双入口可降低完全失联风险。

## 二、前置条件

### 2.1 ECS 侧

- `/etc/ssh/sshd_config` 需要支持公网监听反向端口：

```text
GatewayPorts clientspecified
```

- 重载 SSH：

```bash
sudo systemctl reload sshd
```

- 安全组放行 TCP：`10023`、`10024`（后续再放 `10021`、`10022`）。

### 2.2 zjlab-ubuntu 侧

- 可免密登录 ECS：

```bash
ssh root@47.110.67.161 hostname
```

- 建议 `~/.ssh/config`：

```text
Host ecs-99
    HostName 47.110.67.161
    User root
    ServerAliveInterval 60
    ServerAliveCountMax 3
    ExitOnForwardFailure yes
    TCPKeepAlive yes
    ConnectTimeout 10
```

## 三、systemd 用户服务（双 service）

### 3.1 10023（主）

文件：`/home/aaron/.config/systemd/user/reverse-tunnel-ecs.service`

```ini
[Unit]
Description=Reverse SSH tunnel to ecs-99 (port 10023 -> local SSH)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
Environment="AUTOSSH_GATETIME=0"
Environment="AUTOSSH_POLL=60"
Environment="AUTOSSH_FIRST_POLL=30"
ExecStart=/usr/bin/autossh -M 0 -N -R 0.0.0.0:10023:localhost:22 ecs-99
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=default.target
```

### 3.2 10024（备）

文件：`/home/aaron/.config/systemd/user/reverse-tunnel-ecs-10024.service`

```ini
[Unit]
Description=Reverse SSH tunnel to ecs-99 (port 10024 -> local SSH)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
Environment="AUTOSSH_GATETIME=0"
Environment="AUTOSSH_POLL=60"
Environment="AUTOSSH_FIRST_POLL=30"
ExecStart=/usr/bin/autossh -M 0 -N -R 0.0.0.0:10024:localhost:22 ecs-99
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=default.target
```

### 3.3 服务管理

```bash
export XDG_RUNTIME_DIR=/run/user/1000

systemctl --user daemon-reload
systemctl --user enable --now reverse-tunnel-ecs.service
systemctl --user enable --now reverse-tunnel-ecs-10024.service

systemctl --user status reverse-tunnel-ecs.service
systemctl --user status reverse-tunnel-ecs-10024.service
```

建议开启 linger（防止用户登出后服务消失）：

```bash
sudo loginctl enable-linger aaron
loginctl show-user aaron | grep Linger
```

## 四、连通性验证

### 4.1 ECS 上检查监听

```bash
ssh root@47.110.67.161 "ss -tlnp | grep -E '10023|10024'"
```

预期：`0.0.0.0:10023`、`0.0.0.0:10024` 都存在。

### 4.2 外网检查

```bash
nc -zv 47.110.67.161 10023
nc -zv 47.110.67.161 10024

ssh -p 10023 aaron@47.110.67.161
ssh -p 10024 aaron@47.110.67.161
```

## 五、掉线场景和恢复

### 5.1 会不会突然掉线（10023/10024）

会。根因和 10022 一样，常见包括：

- 源机器离线/重启后服务未拉起
- 源机器网络变化或 DNS 短时失败
- ECS `sshd` 配置变化
- 密钥/认证异常

### 5.2 快速恢复顺序

```bash
# 1) 本机看两个 service
export XDG_RUNTIME_DIR=/run/user/1000
systemctl --user status reverse-tunnel-ecs.service
systemctl --user status reverse-tunnel-ecs-10024.service

# 2) 失败就重启
systemctl --user restart reverse-tunnel-ecs.service
systemctl --user restart reverse-tunnel-ecs-10024.service

# 3) 看最近日志
journalctl --user -u reverse-tunnel-ecs.service --since "10 min ago" --no-pager
journalctl --user -u reverse-tunnel-ecs-10024.service --since "10 min ago" --no-pager

# 4) ECS 验证监听
ssh root@47.110.67.161 "ss -tlnp | grep -E '10023|10024'"
```

## 六、ECS 可观测性（企业应用钉钉告警）

### 6.1 当前线上文件位置

- 脚本：`/opt/tunnel-monitor/tunnel-healthcheck.sh`
- 环境变量：`/etc/tunnel-healthcheck.env`
- 端口配置文件：`/etc/tunnel-healthcheck-ports.conf`（一行一个端口，支持 `#` 注释）
- state：`/var/lib/tunnel-monitor/fail_count`
- systemd：`/etc/systemd/system/tunnel-healthcheck.service`、`/etc/systemd/system/tunnel-healthcheck.timer`

### 6.2 当前监控端口配置

端口由外部文件 `/etc/tunnel-healthcheck-ports.conf` 控制，脚本启动时动态读取。

- 全量监控（四端口）：

```text
10021
10022
10023
10024
```

- 临时只监控 Zhejianglab（72602 未恢复时）：

```text
10023
10024
```

- 临时停用某个端口（加注释）：

```text
#10021
#10022
10023
10024
```

### 6.3 修改监控端口（标准步骤）

在 ECS 上执行：

```bash
# 1) 编辑端口配置文件
vi /etc/tunnel-healthcheck-ports.conf

# 2) 重置失败计数，避免旧状态触发告警
echo 0 > /var/lib/tunnel-monitor/fail_count

# 3) 手动跑一次确认
systemctl start tunnel-healthcheck.service
systemctl status tunnel-healthcheck.service --no-pager
```

### 6.4 钉钉企业应用配置

`/etc/tunnel-healthcheck.env`：

```bash
DINGTALK_CLIENT_ID="<Client ID>"
DINGTALK_CLIENT_SECRET="<Client Secret>"
DINGTALK_AGENT_ID="<AgentId>"
DINGTALK_USER_IDS="<userid1,userid2>"
```

说明：

- 使用企业应用接口，`corpconversation/asyncsend_v2`。
- 消息格式：Markdown + emoji 标题（`🚨 ECS Tunnel Alert`）。
- `DINGTALK_USER_IDS` 支持多个，逗号分隔。
- 文件权限建议保持 `600`。

### 6.5 告警逻辑

- Timer 每分钟执行一次。
- 脚本逐端口检查 TCP 监听。
- 缺失端口：`fail_count += 1`。
- 全部正常：`fail_count` 重置为 `0`。
- 发送条件：`fail_count >= 3`（防抖动）。
- 告警内容包含：Host、Ports File、Missing Ports、Fail Count、Time。

### 6.6 systemd timer

```bash
systemctl daemon-reload
systemctl enable --now tunnel-healthcheck.timer
systemctl status tunnel-healthcheck.timer --no-pager
```

查看日志：

```bash
journalctl -u tunnel-healthcheck.service -n 50 --no-pager
```

## 七、当前部署状态

| 机器 | 主端口 | 备端口 | 管理方式 |
|------|--------|--------|----------|
| zjlab-ubuntu | 10023 | 10024 | autossh + systemd user service |
| 72602-minipc | 10021 | 10022 | autossh + systemd user service |

- 72602-minipc 的 10022 service 额外承载 HTTP（`80→32080`）和 HTTPS（`443→32443`）反向转发。
- ECS 监控已恢复四端口全量检查。
