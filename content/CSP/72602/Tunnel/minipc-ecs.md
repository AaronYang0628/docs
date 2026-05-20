+++
title = "72602-minipc → ecs-99"
tags = ["ssh", "tunnel"]
weight = 1
+++

# SSH 反向隧道：72602-minipc → ecs-99（双入口）

本文档是 72602-minipc 的新标准方案，目标是避免单端口掉线导致完全失联。

- 主入口：`10021`
- 备入口：`10022`
- 两个端口由两个独立 service 维护

## 一、架构

```text
外网任意机器                          ecs-99 (47.110.67.161)                     72602-minipc (192.168.0.25)
ssh -p 10021 aaron@47.110.67.161  ->   0.0.0.0:10021 (sshd) --SSH reverse-->      localhost:22
ssh -p 10022 aaron@47.110.67.161  ->   0.0.0.0:10022 (sshd) --SSH reverse-->      localhost:22
```

> 说明：反向隧道必须由 72602-minipc 主动发起。ECS 上看到端口监听，才表示隧道在线。

## 二、上线前检查

### 2.1 在 72602-minipc 检查基础条件

```bash
# 1) 本机 SSH 服务
sudo systemctl is-active ssh

# 2) autossh 是否安装
autossh -V

# 3) 本机到 ECS 网络与认证
ssh -o ConnectTimeout=5 root@47.110.67.161 hostname
# 期望输出: ecs-99
```

### 2.2 在 ECS 检查前置配置

`/etc/ssh/sshd_config` 至少包含：

```text
GatewayPorts clientspecified
```

重载：

```bash
sudo systemctl reload sshd
```

安全组放行：`10021/tcp`、`10022/tcp`（授权范围按你自己的安全策略）。

同时确认 ECS 本机防火墙（UFW）放行这两个端口：

```bash
sudo ufw status numbered
# 至少应包含 10021/tcp 和 10022/tcp 的 ALLOW 规则
```

## 三、创建双 service（72602-minipc 上执行）

下面步骤全部在 **72602-minipc** 上执行。

### 3.1 统一 SSH 客户端配置（可选但推荐）

编辑 `~/.ssh/config`：

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

### 3.2 创建 systemd 用户服务目录

```bash
mkdir -p ~/.config/systemd/user
```

### 3.3 新建 service（10021 主）

文件：`~/.config/systemd/user/reverse-tunnel-ecs-10021.service`

```ini
[Unit]
Description=Reverse SSH tunnel to ecs-99 (port 10021 -> local SSH)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
Environment="AUTOSSH_GATETIME=0"
Environment="AUTOSSH_POLL=60"
Environment="AUTOSSH_FIRST_POLL=30"
ExecStart=/usr/bin/autossh -M 0 -N -R 0.0.0.0:10021:localhost:22 ecs-99
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=default.target
```

### 3.4 新建 service（10022 备，含 HTTP/HTTPS）

文件：`~/.config/systemd/user/reverse-tunnel-ecs-10022.service`

```ini
[Unit]
Description=Reverse SSH tunnel to ecs-99 (port 10022 -> local SSH)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
Environment="AUTOSSH_GATETIME=0"
Environment="AUTOSSH_POLL=60"
Environment="AUTOSSH_FIRST_POLL=30"
ExecStart=/usr/bin/autossh -M 0 -N \
  -R 0.0.0.0:10022:localhost:22 \
  -R 0.0.0.0:80:localhost:32080 \
  -R 0.0.0.0:443:localhost:32443 \
  ecs-99
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=default.target
```

> 说明：10022 的 service 额外承载 72602-minipc 的 HTTP（`32080`→`80`）和 HTTPS（`32443`→`443`）服务。如果不需要公网 Web 服务，可只保留 SSH 转发。

### 3.5 启用并启动

```bash
export XDG_RUNTIME_DIR=/run/user/$(id -u)

systemctl --user daemon-reload
systemctl --user enable --now reverse-tunnel-ecs-10021.service
systemctl --user enable --now reverse-tunnel-ecs-10022.service

systemctl --user status reverse-tunnel-ecs-10021.service --no-pager
systemctl --user status reverse-tunnel-ecs-10022.service --no-pager
```

### 3.6 防登出失效（强烈建议）

```bash
sudo loginctl enable-linger aaron
loginctl show-user aaron | grep Linger
# 期望: Linger=yes
```

## 四、连通性验证

### 4.1 在 ECS 上看监听

```bash
ssh root@47.110.67.161 "ss -tlnp | grep -E '10021|10022'"
```

期望看到：

- `0.0.0.0:10021`
- `0.0.0.0:10022`

### 4.2 在外网验证

```bash
nc -zv 47.110.67.161 10021
nc -zv 47.110.67.161 10022

ssh -p 10021 aaron@47.110.67.161
ssh -p 10022 aaron@47.110.67.161
```

若 `10021/10022` 外网超时，但 ECS 上已监听，优先检查：

- 云安全组来源网段是否覆盖当前出口 IP
- ECS UFW 是否放行对应端口

## 五、故障恢复（按顺序）

### 场景 A：ECS 本机 `ssh localhost -p 10022` 失败

这说明 ECS 上没有监听 10022，问题几乎总在源机器（72602-minipc）侧。

在 72602-minipc 执行：

```bash
export XDG_RUNTIME_DIR=/run/user/$(id -u)

# 1) 看 service
systemctl --user status reverse-tunnel-ecs-10021.service --no-pager
systemctl --user status reverse-tunnel-ecs-10022.service --no-pager

# 2) 重启 service
systemctl --user restart reverse-tunnel-ecs-10021.service
systemctl --user restart reverse-tunnel-ecs-10022.service

# 3) 看日志
journalctl --user -u reverse-tunnel-ecs-10021.service --since "10 min ago" --no-pager
journalctl --user -u reverse-tunnel-ecs-10022.service --since "10 min ago" --no-pager

# 4) 验证到 ECS 的基础连通
ssh -o ConnectTimeout=5 root@47.110.67.161 echo ok
```

### 场景 B：外网超时但 ECS 本机可通

问题在安全组或 ECS 防火墙，不在隧道本身。

```bash
ssh root@47.110.67.161 "ss -tlnp | grep -E '10021|10022'"
ssh root@47.110.67.161 "iptables -L INPUT -n | grep -E '10021|10022' || true"
```

### 场景 C：重启后隧道没起来

```bash
export XDG_RUNTIME_DIR=/run/user/$(id -u)
systemctl --user is-enabled reverse-tunnel-ecs-10021.service
systemctl --user is-enabled reverse-tunnel-ecs-10022.service
loginctl show-user aaron | grep Linger
```

## 六、常用运维命令

```bash
export XDG_RUNTIME_DIR=/run/user/$(id -u)

# 重载并重启
systemctl --user daemon-reload
systemctl --user restart reverse-tunnel-ecs-10021.service
systemctl --user restart reverse-tunnel-ecs-10022.service

# 停止
systemctl --user stop reverse-tunnel-ecs-10021.service
systemctl --user stop reverse-tunnel-ecs-10022.service

# 日志实时跟踪
journalctl --user -u reverse-tunnel-ecs-10021.service -f
journalctl --user -u reverse-tunnel-ecs-10022.service -f
```

## 七、和现网监控的关系

ECS 侧的巡检/钉钉告警脚本已经按四端口设计（`10021/10022/10023/10024`）。

当 72602-minipc 双入口上线后，ECS 无需改架构，只要确认：

- 安全组已放行 `10021/10022`
- `/etc/tunnel-healthcheck-ports.conf` 包含 `10021`、`10022`
- `/etc/tunnel-healthcheck.env` 企业应用参数可用（`DINGTALK_CLIENT_ID/SECRET/AGENT_ID/USER_IDS`）

当前线上实现：

- 告警通道为钉钉企业应用 API（非 webhook）
- 告警消息为 Markdown 格式（标题：`🚨 ECS Tunnel Alert`）
- 连续失败 3 次才发送告警（防抖）
