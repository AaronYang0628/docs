+++
title = 'Homepage'
date = 2026-05-12T15:00:59+08:00
weight = 60
+++

### Backup

Homepage 的配置全部存储在 Git 仓库中：

| 路径 | 内容 |
|---|---|
| `manifests/homepage/config/bookmarks.yaml` | 书签 |
| `manifests/homepage/config/services.yaml` | 服务 widgets |
| `manifests/homepage/config/settings.yaml` | 布局设置 |
| `manifests/homepage/config/widgets.yaml` | 仪表盘小部件 |
| `manifests/homepage/config/docker.yaml` | Docker 集成 |
| `manifests/homepage/config/kubernetes.yaml` | K8s 集成 |
| `manifests/homepage/configmap.yaml` | 生成的 ConfigMap |

### 恢复步骤

```bash
# 1. 确认配置文件正确
bash scripts/gen-homepage-configmap.sh

# 2. 更新 ConfigMap
kubectl -n monitor apply -f manifests/homepage/configmap.yaml

# 3. 触发重载
kubectl -n monitor rollout restart deploy/homepage
```
