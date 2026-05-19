+++
title = "zjlab-ubuntu → ecs-99"
tags = ["ssh", "tunnel"]
weight = 1
+++

## 一、隧道如何建立

### 1.1 SSH 密钥认证（前置条件）

本地机器用 SSH 密钥免密登录 ECS，公钥已预先放入 ECS 的
`/root/.ssh/authorized_keys`。

```bash
# 确认密钥存在
ls -l ~/.ssh/id_rsa

# 测试免密登录
ssh root@47.110.67.161 hostname
# 应输出: ecs-99
```

### 1.2 SSH 客户端配置

`~/.ssh/config` 中的配置保证了连接的健壮性：

```
Host ecs-99
    HostName 47.110.67.161
    User root
    ServerAliveInterval 60    # 每 60 秒发一次心跳包
    ServerAliveCountMax 3     # 3 次心跳无响应则断开
    ExitOnForwardFailure yes  # 端口转发失败就退出（便于上层感知）
    TCPKeepAlive yes          # 开启 TCP 层面的 keepalive
    ConnectTimeout 10         # 连接超时 10 秒
```

### 1.3 核心命令

```bash
autossh -M 0 -N -R 10023:localhost:22 ecs-99
```

参数说明：

| 参数 | 含义 |
|------|------|
| `-M 0` | 关闭 autossh 独立监控端口，靠 SSH 自身保活检测 |
| `-N` | 不执行远程命令（纯端口转发） |
| `-R 10023:localhost:22` | **反向转发**：ECS 的 10023 → 本机的 22 |
| `ecs-99` | SSH 配置中定义的别名 |

### 1.4 ECS 侧要求

ECS 的 `/etc/ssh/sshd_config` 必须包含：

```
GatewayPorts yes
```

这使反向隧道监听 `0.0.0.0:10023`（所有网卡），否则只监听 `127.0.0.1:10023`
（仅 ECS 本地可访问）。

```bash
# 在 ECS 上检查
ssh root@47.110.67.161 "grep GatewayPorts /etc/ssh/sshd_config"
# 应输出: GatewayPorts yes
```

### 1.5 systemd 用户服务

`~/.config/systemd/user/reverse-tunnel-ecs.service`：

```ini
[Unit]
Description=Reverse SSH tunnel to ecs-99 (port 10023 → local SSH)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
Environment="AUTOSSH_GATETIME=0"     # 失败后立即允许重启
Environment="AUTOSSH_POLL=60"        # 每 60 秒探测一次
Environment="AUTOSSH_FIRST_POLL=30"  # 启动 30 秒后首次探测
ExecStart=/usr/bin/autossh -M 0 -N -R 10023:localhost:22 ecs-99
Restart=always
RestartSec=10                        # 退出后 10 秒重启

[Install]
WantedBy=default.target              # 用户登录时自动启动
```

autossh 的监控机制：定期通过 SSH 通道发送探测包，如果连接僵死（进程未退
出但链路不通），autossh 会主动杀掉 ssh 进程，systemd 随后在 10 秒内拉起新
进程。

如果 autossh 未安装，回退方案是用纯 ssh —— 把 `ExecStart` 改为：

```
ExecStart=/usr/bin/ssh -N -R 10023:localhost:22 ecs-99
```

纯 ssh + systemd `Restart=always` 也能处理进程退出后的重连，但无法检测
"进程存活但链路僵死"的情况。

---

## 二、隧道状态检查

### 2.1 检查本地 systemd 服务

```bash
# 在 zjlab-ubuntu 上执行

# 设置环境变量（SSH 非交互会话需要）
export XDG_RUNTIME_DIR=/run/user/1000

# 查看服务状态
systemctl --user status reverse-tunnel-ecs.service
```

正常输出应包含：

```
Active: active (running) since ...
Main PID: xxxxx (autossh)
```

### 2.2 检查 ECS 监听端口

```bash
# 在 ECS 上直接执行
ssh root@47.110.67.161 "ss -tlnp | grep 10023"
```

正常输出应为：

```
LISTEN 0 128  0.0.0.0:10023  0.0.0.0:*  users:(("sshd",pid=...,fd=5))
LISTEN 0 128     [::]:10023     [::]:*  users:(("sshd",pid=...,fd=7))
```

如果只看到 `127.0.0.1:10023` 而非 `0.0.0.0:10023`，说明 ECS 没配
`GatewayPorts yes`。

### 2.3 从外网测试连通性

```bash
# 在任意外网机器上执行

# 测试端口是否可达
nc -zv 47.110.67.161 10023

# 实际 SSH 连接
ssh -p 10023 aaron@47.110.67.161
```

预期 `nc -zv` 输出：

```
Connection to 47.110.67.161 10023 port [tcp/*] succeeded!
```

### 2.4 查看 SSH 进程详情

```bash
# 在 zjlab-ubuntu 上执行

# 查看隧道相关进程
ps aux | grep -E "autossh|ssh.*10023"

# 查看连接建立的时长
ps -eo pid,etime,args | grep -E "autossh|ssh.*10023"
```

### 2.5 查看日志

```bash
# 在 zjlab-ubuntu 上执行
export XDG_RUNTIME_DIR=/run/user/1000

# 查看最近日志
journalctl --user -u reverse-tunnel-ecs.service --since "10 min ago" --no-pager

# 实时跟踪日志
journalctl --user -u reverse-tunnel-ecs.service -f
```

---

## 三、故障排查

### 问题 1：外网连接超时 "connection timed out"

**症状**：

```
ssh -p 10023 aaron@47.110.67.161
ssh: connect to host 47.110.67.161 port 10023: Connection timed out
```

**排查步骤**：

```bash
# 步骤 1: 检查 zjlab-ubuntu 上的服务是否在运行
export XDG_RUNTIME_DIR=/run/user/1000
systemctl --user status reverse-tunnel-ecs.service

# 如果服务未运行，手动启动
systemctl --user restart reverse-tunnel-ecs.service

# 步骤 2: 检查 ECS 上端口是否在监听
ssh root@47.110.67.161 "ss -tlnp | grep 10023"

# 步骤 3: 确认监听地址是 0.0.0.0 而非 127.0.0.1
# 如果显示 127.0.0.1:10023，检查 ECS 的 GatewayPorts 配置
ssh root@47.110.67.161 "grep GatewayPorts /etc/ssh/sshd_config"

# 步骤 4: 检查阿里云安全组是否放行 10023（云控制台操作）
# 阿里云控制台 → ECS → 安全组 → 添加入方向规则
# 协议: TCP  端口: 10023  授权对象: 0.0.0.0/0

# 步骤 5: 检查 ECS 的 UFW/iptables 是否放行
ssh root@47.110.67.161 "iptables -L INPUT -n | grep 10023"

# 步骤 6: 检查是否有残留 DNAT 规则劫持流量
ssh root@47.110.67.161 "iptables-save | grep 10023"
# 正常只应有 ufw-user-input 的 ACCEPT 规则
# 如果有 dnat 规则，按问题 2 处理
```

### 问题 2：DNAT 规则拦截

**症状**：端口在监听、UFW 已放行、安全组已配置，但从外网仍连不上。有时
`ss` 能看到 `packets 0`（反向隧道收到了 0 个包），而有旧 DNAT 规则显示
`packets > 0`。

**排查**：

```bash
# 检查 iptables NAT 表是否有劫持
ssh root@47.110.67.161 "iptables -t nat -L PREROUTING -n --line-numbers | grep 10023"
```

**修复**：

```bash
# 删除对应的 DNAT 规则（假设行号是 2）
ssh root@47.110.67.161 "iptables -t nat -D PREROUTING 2"

# 确认已删除
ssh root@47.110.67.161 "iptables -t nat -L PREROUTING -n | grep 10023"
# 应无输出
```

### 问题 3：服务反复重启

**症状**：`systemctl status` 显示服务不断重启。

```bash
# 查看日志找原因
export XDG_RUNTIME_DIR=/run/user/1000
journalctl --user -u reverse-tunnel-ecs.service --since "5 min ago" --no-pager

# 常见原因：
# - "Permission denied" → ECS 上密钥被清或过期，重新拷贝公钥
# - "Could not resolve hostname" → zjlab-ubuntu DNS 不通，检查网络
# - "Connection refused" → ECS 的 sshd 没运行
# - "exit status 255" → 网络不通或 ECS 不可达
```

### 问题 4：ECS 端口在监听但连上去无响应

```bash
# 在 ECS 本地测试隧道是否正常转发
ssh root@47.110.67.161 "ssh -o ConnectTimeout=5 -p 10023 aaron@127.0.0.1 hostname"
# 能连上 zjlab-ubuntu 说明隧道转发正常

# 如果 ECS 本地能连但外网不行 → 问题在安全组或防火墙
# 如果 ECS 本地也连不上 → 检查 zjlab-ubuntu 的 sshd
```

### 问题 5：每次重启/登出后隧道消失

需要在 zjlab-ubuntu 上开启 linger，使 systemd 用户服务在登出后继续运行：

```bash
# 在 zjlab-ubuntu 桌面终端执行
sudo loginctl enable-linger aaron

# 确认已开启
loginctl show-user aaron | grep Linger
# 应输出: Linger=yes
```

开启后，系统启动时就自动拉起隧道，不需要等用户登录。

---

## 四、常用操作

```bash
# === 在 zjlab-ubuntu 上执行（注意先 export XDG_RUNTIME_DIR） ===
export XDG_RUNTIME_DIR=/run/user/1000

# 停止隧道
systemctl --user stop reverse-tunnel-ecs.service

# 启动隧道
systemctl --user start reverse-tunnel-ecs.service

# 重启隧道（更新配置后）
systemctl --user daemon-reload
systemctl --user restart reverse-tunnel-ecs.service

# 禁用开机自启
systemctl --user disable reverse-tunnel-ecs.service

# 重新启用
systemctl --user enable reverse-tunnel-ecs.service

# === 使用隧道 ===
ssh -p 10023 aaron@47.110.67.161            # SSH 登录
scp -P 10023 file aaron@47.110.67.161:/tmp/ # 传文件
sftp -P 10023 aaron@47.110.67.161           # SFTP
```