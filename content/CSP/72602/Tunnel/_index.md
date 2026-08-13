+++
title = 'Network Tunnels'
date = 2024-03-07T15:00:59+08:00
+++

72602 使用两类独立隧道：

- SSH 主入口：`10021`
- SSH 备入口：`10022`
- Web 数据通道：WireGuard UDP `51820`
- 目标 ECS：`47.110.67.161 (ecs-99)`

公网 Web `80/443` 固定由 ECS HAProxy 监听，经 WireGuard 转发到
72602-minipc 的 ingress NodePort。SSH 不再承载 Web；`10022` 仍保留 Mailu
loopback forwards。

快速连接命令：

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
