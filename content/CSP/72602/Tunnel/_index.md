+++
title = 'Network Tunnels'
date = 2024-03-07T15:00:59+08:00
+++

72602 使用两类独立隧道；ZJLAB 的 SSH 入口是另一组 ECS loopback-only
监听器，不能与本页的公网 72602 入口混用：

- SSH 主入口：`10021`
- SSH 备入口：`10022`
- Web 数据通道：WireGuard UDP `51820`
- 目标 ECS：`47.110.67.161 (ecs-99)`

ZJLAB 使用 ECS ProxyJump 访问 `10023`（primary）和 `10024`（backup）。这
两个端口只绑定 ECS loopback，由独立监控进程检查并通过 DingTalk 告警；它们
没有公网安全组规则。

公网 Web `80/443` 固定由 ECS HAProxy 监听，经 WireGuard 转发到
72602-minipc 的 ingress NodePort。SSH 不再承载 Web；`10022` 仍保留 Mailu
loopback forwards。

快速连接命令：

以下命令仅适用于当前登记在 ECS 安全组白名单中的来源客户端，并使用 SSH
密钥认证；`10021/10022` 不是面向任意公网客户端的开放入口。

```bash
ssh -p 10021 aaron@47.110.67.161
ssh -p 10022 aaron@47.110.67.161
```

上线顺序建议：

1. 先在 72602-minipc 创建并启动 `10022`（备入口）
2. 验证 ECS 已监听 `10022`
3. 再创建并启动 `10021`（主入口）
4. 最后做外网双端口连通性验证

完整步骤、故障恢复与运维命令见子页面。

{{%children depth="999" description="false" showhidden="true" %}}
