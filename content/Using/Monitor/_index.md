+++
title = 'Monitor'
date = 2025-03-07T15:00:59+08:00
weight = 130
+++

{{%children depth="999" description="false" showhidden="true" %}}

### FAQ

{{% expand title="Homepage 页面空白或加载不出内容" %}}
**排查步骤**：

1. 检查 pod 是否运行：
   ```bash
   kubectl -n monitor get pods -l app.kubernetes.io/name=homepage
   ```

2. 检查 ConfigMap 是否更新（Homepage 配置热加载依赖 Reloader annotation）：
   ```bash
   kubectl -n monitor get configmap homepage -o yaml | head -20
   ```

3. 查看 Homepage 容器日志：
   ```bash
   kubectl -n monitor logs -l app.kubernetes.io/name=homepage
   ```

4. 如果修改了 `services.yaml` 或 `bookmarks.yaml`，需要触发 pod 重启：
   ```bash
   kubectl -n monitor rollout restart deploy/homepage
   ```
{{% /expand %}}

{{% expand title="Uptime Kuma 监控页面打不开" %}}
**排查步骤**：

```bash
# 检查 pod
kubectl -n monitor get pods -l app.kubernetes.io/name=uptime-kuma

# 检查 ingress
kubectl -n monitor get ingress uptime-kuma

# 检查证书
kubectl -n monitor get certificate uptime-kuma-tls
```
{{% /expand %}}

{{% expand title="如何在 Homepage 添加新的 service widget" %}}
编辑 `manifests/homepage/config/services.yaml`，按格式添加：

```yaml
- AI:
    - Open WebUI:
        icon: https://raw.githubusercontent.com/AaronYang0628/docs/main/static/icons/port_icon.png
        href: https://txt2img.agent.72602.online
        description: AI Chat WebUI
```

然后重新生成 ConfigMap 并 apply：

```bash
bash scripts/gen-homepage-configmap.sh
kubectl -n monitor apply -f manifests/homepage/configmap.yaml
```
{{% /expand %}}

{{% expand title="Uptime Kuma 如何导入 / 导出监控项" %}}
Uptime Kuma Web UI → Settings → Backup → Export/Import JSON。
{{% /expand %}}
