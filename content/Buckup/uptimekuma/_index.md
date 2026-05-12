+++
title = 'Uptime Kuma'
date = 2026-05-12T15:00:59+08:00
weight = 50
+++

### Backup via Web UI

Uptime Kuma 内置了备份功能：

1. 登录 `https://uptime.72602.online`
2. 进入 **Settings** → **Backup**
3. 点击 **Export** → 下载 JSON 文件
4. 备份文件包含：所有监控项、状态页配置、通知设置

### Restore

1. 登录 Uptime Kuma
2. 进入 **Settings** → **Backup**
3. 点击 **Import** → 选择之前下载的 JSON 文件
4. 确认后自动恢复所有配置

### 注意事项

- 备份文件不包含监控历史数据，只包含配置
- 历史数据存储在 SQLite 数据库中（`/app/data/kuma.db`）
- 如需保留历史，可以备份 SQLite 文件：
  ```bash
  kubectl -n monitor exec deploy/uptime-kuma -- cat /app/data/kuma.db > kuma-backup-$(date +%Y%m%d).db
  ```
