+++
title = 'Uptime Kuma'
date = 2026-05-12T15:00:59+08:00
weight = 50
+++

### Backup via Web UI

Uptime Kuma 内置了备份功能：

1. 登录 `https://uptime.72602.space`
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
- Uptime Kuma 的 PVC 没有自动备份。2026-10-01 恢复时，旧 PVC/PV 已不存在，仓库中也没有 UI 导出或 SQLite 备份；当前实例使用全新的空数据库，原监控项、通知设置和历史记录无法从集群恢复。
- 重新创建 ZJLAB Push 监控后，必须把新生成的 Push URL 更新到 ECS 私有配置中；不要继续使用旧 URL。
- 如需保留历史，可以备份 SQLite 文件：
  ```bash
  kubectl -n monitor exec deploy/uptime-kuma -- cat /app/data/kuma.db > kuma-backup-$(date +%Y%m%d).db
  ```
