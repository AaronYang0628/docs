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
ECS HAProxy :25/:465/:587/:993 -> 127.0.0.1:10225/:10465/:10587/:10993 (sshd)
                                      --SSH reverse--> minipc hostPort :25/:465/:587/:993
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

### 3.4 10022 备入口（含 HTTP/HTTPS 和 Mailu）

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
  -R 127.0.0.1:10225:127.0.0.1:25 \
  -R 127.0.0.1:10465:127.0.0.1:465 \
  -R 127.0.0.1:10587:127.0.0.1:587 \
  -R 127.0.0.1:10993:127.0.0.1:993 \
  ecs-99
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=default.target
```

> 说明：10022 的 service 额外承载 72602-minipc 的 HTTP（`32080`→`80`）、
> HTTPS（`32443`→`443`）和 Mailu 四个 hostPort。ECS 上的四个 Mailu
> 入口必须是 loopback-only；公网绑定由 HAProxy 完成。

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
- `127.0.0.1:10225`, `127.0.0.1:10465`, `127.0.0.1:10587`, `127.0.0.1:10993` (sshd)

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

### 4.3 Mailu 入口验证

在 ECS 上确认公网端口归 HAProxy、高位端口归 sshd：

```bash
sudo systemctl is-active haproxy
haproxy -c -f /etc/haproxy/haproxy.cfg
sudo ss -ltnp
```

从不发送邮件数据的测试客户端验证 banner、TLS 和 STARTTLS。relay 检查最多
发送 `EHLO`、`MAIL FROM`、`RCPT TO`、`QUIT`，不要发送 `DATA`，不要认证。
同时检查 ArgoCD 与 front rollout：

```bash
argocd app get ops-docs --refresh --insecure --grpc-web
argocd app get mailu --refresh --insecure --grpc-web
kubectl -n mailu rollout status deployment/mailu-front
kubectl -n mailu get endpoints mailu-front mailu-front-ext
```

若 Dovecot 报 `Client not trusted`，先检查 Mailu `realIpFrom` 与 hostPort/CNI
实际传输源是否一致。修正必须提交到 Git 并等待 ArgoCD 自动同步，不能手动
patch、apply、sync 或重启 Mailu。

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

ECS 侧巡检仅监控 72602-minipc 的两个公开入口。

当 72602-minipc 双入口上线后，ECS 无需改架构，只要确认：

- 安全组已放行 `10021/10022`
- `/etc/tunnel-healthcheck-ports.conf` 包含 `10021`、`10022`
- `/etc/tunnel-healthcheck.env` 企业应用参数可用（`DINGTALK_CLIENT_ID/SECRET/AGENT_ID/USER_IDS`）

当前线上实现：

- 告警通道为钉钉企业应用 API（非 webhook）
- 告警消息为 Markdown 格式（标题：`🚨 ECS Tunnel Alert`）
- 连续失败 3 次才发送告警（防抖）

## 八、Mailu 代理回滚

按以下顺序回滚，不恢复旧 HAProxy 配置，也不卸载 HAProxy：

```bash
# ECS
sudo systemctl stop haproxy

# 72602-minipc（使用实际保存的备份路径）
cp /home/aaron/Ops/ops-private/backups/reverse-tunnel-ecs-10022.service.<UTC>.before-haproxy \
  ~/.config/systemd/user/reverse-tunnel-ecs-10022.service
export XDG_RUNTIME_DIR=/run/user/$(id -u)
systemctl --user daemon-reload
systemctl --user restart reverse-tunnel-ecs-10022.service
```

若还原 ECS 的 `GatewayPorts` 修正，恢复对应的
`/var/backups/sshd_config.<UTC>.before-haproxy`，执行 `sshd -t` 后 reload
`sshd`，再按上面步骤恢复并重启 10022。10021 不在本次回滚范围内。
