+++
title = 'Open WebUI'
date = 2026-05-12T15:00:59+08:00
weight = 45
+++

### Backup Chat History (SQLite)

Open WebUI 的数据默认存储在 SQLite 数据库中：

```bash
# 备份数据库文件
kubectl -n ai exec open-webui-0 -- cat /app/backend/data/webui.db > open-webui-$(date +%Y%m%d).db
```

### Restore

```bash
# 复制备份文件到 pod
kubectl -n ai cp open-webui-20260512.db open-webui-0:/app/backend/data/webui.db

# 重启 pod 以重新加载数据库
kubectl -n ai delete pod open-webui-0
```

### 注意事项

- 备份文件包含：聊天记录、用户设置、外部连接配置
- 不包含：对话中的文件附件（存储在 `static/uploads/` 目录）
- 如需完整恢复，还需备份上传文件：
  ```bash
  kubectl -n ai exec open-webui-0 -- tar czf - /app/backend/data/uploads > open-webui-uploads-$(date +%Y%m%d).tar.gz
  ```
