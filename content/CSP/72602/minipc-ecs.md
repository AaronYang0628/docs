+++
title = "72602-minipc → ecs-99"
tags = ["ssh", "tunnel"]
weight = 1
+++

# SSH 反向隧道：72602-minipc → ecs-99

## 原理

```
ecs-99 (47.110.67.161)                    72602-minipc (192.168.0.25)
┌─────────────────┐                       ┌─────────────────────┐
│ localhost:10022 │── 公网 SSH 隧道 ──→   │ localhost:22 (sshd) │
│    (监听)        │  ← 由 72602-minipc    │                     │
│                 │     主动发起并维持     │                     │
└─────────────────┘                       └─────────────────────┘
```

72602-minipc 主动 SSH 到 ecs-99，在 ecs-99 上开一个监听端口，反向转发回自己的 SSH 服务。只要 72602-minipc 能上网，隧道就会一直保持。

## 使用方式

**从任意位置直连：**

```bash
ssh aaron@47.110.67.161 -p 10022
```

也可以在 ecs-99 本地使用：

```bash
ssh aaron@localhost -p 10022
```

## 当前部署方式 (systemd 自动管理)

隧道由 systemd 服务 `ssh-reverse-tunnel.service` 管理，开机自启、断线自动重连。

### 查看隧道状态

```bash
systemctl status ssh-reverse-tunnel
```

正常状态应显示 `active (running)`，如：

```
● ssh-reverse-tunnel.service - SSH Reverse Tunnel to ecs-99
     Active: active (running) since ...
   Main PID: 68372 (ssh)
```

### 确认端口在 ecs-99 上正常监听

在 **72602-minipc** 上运行：

```bash
ssh root@47.110.67.161 "ss -tlnp | grep 10022"
```

应看到：

```
LISTEN 127.0.0.1:10022  (sshd)
LISTEN [::1]:10022      (sshd)
```

### 查看隧道日志

```bash
journalctl -u ssh-reverse-tunnel -f
```

### 手动重启隧道

```bash
sudo systemctl restart ssh-reverse-tunnel
```

### 手动建立隧道（不依赖 systemd）

```bash
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=30 -N -R 10022:localhost:22 root@47.110.67.161
```

## 故障恢复

### 场景 1：SSH localhost -p 10022 连不上

**在 72602-minipc 上执行：**

```bash
# 1. 检查隧道是否在运行
systemctl status ssh-reverse-tunnel

# 2. 若不正常，重启
sudo systemctl restart ssh-reverse-tunnel

# 3. 确认 72602-minipc 能直接连 ecs-99（验证网络和认证）
ssh -o ConnectTimeout=5 root@47.110.67.161 echo ok

# 4. 如果步骤 3 失败，检查网络：
ip route | grep default
ping -c 3 47.110.67.161
```

### 场景 2：隧道反复断开

常见原因：

| 原因 | 修复 |
|------|------|
| 网络不稳定 | 隧道会自动重连（`RestartSec=10`），等一会即可 |
| 端口 10022 被旧隧道占用 | `ssh root@47.110.67.161 "ss -tlnp \| grep 10022"` 查看，等待旧连接超时或 kill |
| SSH 认证过期 | 确认 `/home/aaron/.ssh/id_rsa` 仍被 ecs-99 的 root 授权 |

### 场景 3：72602-minipc 重启后

systemd 服务已 enable，会开机自启。确认：

```bash
systemctl is-enabled ssh-reverse-tunnel
# 输出: enabled

systemctl is-active ssh-reverse-tunnel
# 输出: active
```

## 服务文件位置

```
/etc/systemd/system/ssh-reverse-tunnel.service
```

内容：

```ini
[Unit]
Description=SSH Reverse Tunnel to ecs-99
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=aaron
ExecStart=/usr/bin/ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=30 -o ExitOnForwardFailure=yes -N -R 10022:localhost:22 root@47.110.67.161
Restart=always
RestartSec=10
KillMode=process

[Install]
WantedBy=multi-user.target