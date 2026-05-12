+++
title = "Tailscale"
tags = ["tailscale", "derp", "iptables", "nat"]
+++

# Linux 内网穿透与网络环境配置实操手册

## 第一阶段：公网 VPS 端（中继与流量入口）

### 1. 安装与登录 Tailscale

在公网机器上执行：

```bash
# 安装
curl -fsSL https://tailscale.com/install.sh | sh

# 启动并登录
sudo tailscale up
```

执行后点击终端显示的链接完成身份认证。

### 2. Docker 部署 DERP 中继服务器

使用 Docker 运行 DERP，为隧道提供低延迟保底。

```bash
# 创建证书存储目录
mkdir -p /opt/derp/certs

# 启动容器
docker run -d \
  --name derper \
  --restart always \
  -p 443:443 \
  -p 3478:3478/udp \
  -v /opt/derp/certs:/app/certs \
  -v /var/run/tailscale/tailscaled.sock:/var/run/tailscale/tailscaled.sock \
  -e DERP_DOMAIN=72602.online \
  -e DERP_CERT_MODE=letsencrypt \
  fredliang/derper
```

### 3. 配置 iptables 端口转发

你当前 ECS 实际使用的是以下 3 条规则：

```bash
sudo iptables -t nat -A PREROUTING -p tcp --dport 10022 -j DNAT --to-destination 100.81.60.34:22
sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j DNAT --to-destination 100.81.60.34:32080
sudo iptables -t nat -A PREROUTING -p tcp --dport 443 -j DNAT --to-destination 100.81.60.34:32443
sudo iptables -t nat -A POSTROUTING -j MASQUERADE
```

上面分别对应：

- `10022 -> 22`（SSH）
- `80 -> 32080`（Ingress HTTP）
- `443 -> 32443`（Ingress HTTPS）

如果要改成批量端口映射，可再使用下面的通用模板。

```bash
# 1) 开启内核转发
echo "net.ipv4.ip_forward = 1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# 2) 定义变量（将 100.x.y.z 替换为内网机器 Tailscale IP）
INNER_IP="100.x.y.z"

# 3) 转发 SSH（例如 10022 -> 22）
sudo iptables -t nat -A PREROUTING -p tcp --dport 10022 -j DNAT --to-destination ${INNER_IP}:22

# 4) 批量转发 10 个端口（8000-8009）
sudo iptables -t nat -A PREROUTING -p tcp --dport 8000:8009 -j DNAT --to-destination ${INNER_IP}

# 5) 配置 SNAT（必做，否则无法回包）
sudo iptables -t nat -A POSTROUTING -j MASQUERADE

# 6) 持久化规则（防止重启丢失）
sudo apt install iptables-persistent -y
sudo netfilter-persistent save
```

---

## 第二阶段：Tailscale 管理后台配置（ACL）

登录 [Tailscale Admin Console](https://login.tailscale.com/admin/acls)，在编辑框内找到 `derpMap` 位置，填入以下 JSON：

```json
"derpMap": {
  "OmitDefaultRegions": false,
  "Regions": {
    "901": {
      "RegionID": 901,
      "RegionCode": "custom-relay",
      "RegionName": "My-Online-Derp",
      "Nodes": [
        {
          "Name": "1",
          "RegionID": 901,
          "HostName": "72602.online",
          "IPv4": "你的公网VPS真实IP",
          "DERPPort": 443,
          "STUNPort": 3478
        }
      ]
    }
  }
}
```

---

## 第三阶段：内网 Mini PC 端（环境净化）

### 1. 启动 Tailscale（禁用 DNS 接管）

```bash
sudo tailscale up --accept-dns=false
```

### 2. 彻底禁用系统解析服务

防止 `systemd-resolved` 改写 `/etc/resolv.conf`。

```bash
sudo systemctl stop systemd-resolved
sudo systemctl disable systemd-resolved
```

### 3. 手动配置 DNS 并锁定

```bash
# 移除原有链接
sudo rm /etc/resolv.conf

# 写入 DNS
cat <<'EOF' | sudo tee /etc/resolv.conf
nameserver 8.8.8.8
nameserver 1.1.1.1
options timeout:2 attempts:3
EOF

# 锁定文件，防止被修改
sudo chattr +i /etc/resolv.conf
```

如需修改 DNS，请先执行 `sudo chattr -i /etc/resolv.conf`。

---

## 第四阶段：检查与连接方式

### 1. 检查指令

| 检查项 | 命令 | 预期 |
| --- | --- | --- |
| 中继状态 | `tailscale netcheck` | 看到 `My-Online-Derp` 延迟较低 |
| DNS 状态 | `nslookup google.com` | 显示由 `8.8.8.8` 或 `1.1.1.1` 返回 |
| 转发计数 | `sudo iptables -t nat -L -n -v` | 对应端口有 `pkts` 计数 |

### 2. 本地 SSH 配置（外网设备）

编辑 `~/.ssh/config`：

```text
Host minipc
    HostName minipc.72602.online
    Port 10022
    User 你的内网机器用户名
```

### 3. DNS A 记录

确保域名解析已配置：

- `72602.online` -> 公网 VPS IP
- `minipc.72602.online` -> 公网 VPS IP

---

完成后链路即为：`ssh minipc` -> 公网 `10022` -> ECS `iptables` -> Tailscale 隧道 -> 内网主机 `22`。
