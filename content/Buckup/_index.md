+++
title = '🧯BuckUp'
date = 2024-03-07T15:00:59+08:00
weight = 21
+++

This section documents backup strategies for each middleware/app deployed in the 72602 cluster.

### Backup Quick Reference

| Service | Method | Data | Frequency | Restore |
|---|---|---|---|---|
| PostgreSQL | `pg_dump` | All databases | Daily crons | `psql` restore |
| Redis | RDB/AOF | Cache data | On-demand | Auto on restart |
| Minio | `mc mirror` | Object storage | Periodic | `mc mirror` reverse |
| N8N | Web UI export | Workflows + credentials | Manual | Web UI import |
| Uptime Kuma | Web UI Backup | Monitors + settings | Manual | Web UI upload |
| Open WebUI | SQLite copy | Chat history + config | Manual | File replace |
| Homepage | Git-managed | Dashboard config | On commit | `kubectl apply` |
| ElasticSearch | Snapshot API | Indexes | Scheduled | Snapshot restore |
| Git repos | GitHub hosting | Source code | Automatic | Git clone |

{{%children depth="999" description="false" showhidden="true" %}}
