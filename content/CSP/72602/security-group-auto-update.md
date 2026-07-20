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
每 5 分钟 ──> 获取公网 IP (ifconfig.me → ip.sb → icanhazip.com)
                 │
                 ├── 全部失败 ──> 钉钉告警，退出
                 │
                 └── 获取成功 ──> 与上次对比
                                 ├── 未变化 ──> 退出
                                 └── 已变化 ──> 更新安全组规则 → 钉钉通知
```

## 受影响的端口

| 端口 | 用途 |
|------|------|
| 22 | ECS SSH 直接连接、反向隧道 |
| 10021 | 预留 |
| 10022 | SSH 反向隧道（72602-minipc 入口） |

## 文件位置

| 文件 | 说明 |
|------|------|
| `/home/aaron/bin/update-sg-ip.sh` | 主脚本 |
| `/home/aaron/.aliyun-keys` | 阿里云 AccessKey（chmod 600） |
| `/etc/systemd/system/update-sg-ip.service` | systemd 服务 |
| `/etc/systemd/system/update-sg-ip.timer` | systemd 定时器（每 5 分钟，开机 30 秒后首次触发） |
| `/tmp/last_public_ip` | 上次公网 IP 缓存 |

## AliDNS 环境

- 官方 AliDNS SDK 使用独立虚拟环境 `/home/aaron/.local/venvs/alidns`。
- SDK 或依赖需要下载时，使用 HTTP 代理 `http://192.168.0.25:17890`。
- 当前凭证具备 `72602.online` 区域的 AliDNS 记录管理能力，也具备 ECS 安全组变更能力。
- DNS 变更前应限定目标区域和记录，并在变更后分别执行权威 DNS 与公共 DNS 验证。

## 常用命令

```bash
# 查看定时器状态
systemctl status update-sg-ip.timer

# 手动触发一次更新
sudo systemctl start update-sg-ip.service

# 查看执行日志
journalctl -u update-sg-ip.service -f

# 查看脚本输出
cat /tmp/update-sg-ip.log

# 手动运行脚本
~/bin/update-sg-ip.sh
```

## 钉钉通知

脚本支持钉钉机器人通知。需要设置 DING_TOKEN 环境变量或修改脚本中的 `DING_TOKEN` 变量：

```bash
# 在 ~/.aliyun-keys 中添加：
DING_TOKEN=你的钉钉机器人access_token
```

## 凭证安全

阿里云 AccessKey 存储在 `/home/aaron/.aliyun-keys`，权限 600。
当前同一 AccessKey 同时具备 ECS 安全组和 AliDNS 变更权限；后续应拆分为两个最小权限 RAM 身份。
`/home/aaron/bin/update-sg-ip.sh` 当前权限为 0775，仍可由组写入；应收紧为 0755。此项为待执行的加固建议，并非已完成状态。
定期轮换 AccessKey。AccessKey 获取：阿里云控制台 → 头像 → AccessKey 管理。
