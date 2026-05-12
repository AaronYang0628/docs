+++
title = 'Redis'
date = 2026-05-12T15:00:59+08:00
weight = 20
+++

### Manual RDB backup

```bash
# Trigger RDB save
kubectl -n storage exec redis-shared-master-0 -- redis-cli -a <password> SAVE

# Copy RDB file
kubectl -n storage cp redis-shared-master-0:/data/dump.rdb ./redis-backup-$(date +%Y%m%d).rdb
```

### Manual AOF backup

```bash
# Trigger AOF rewrite
kubectl -n storage exec redis-shared-master-0 -- redis-cli -a <password> BGREWRITEAOF

# Copy AOF file
kubectl -n storage cp redis-shared-master-0:/data/appendonly.aof.1.base.rdb ./redis-aof-$(date +%Y%m%d).rdb
```

### Restore

```bash
# Copy backup file to pod
kubectl -n storage cp ./redis-backup-20260512.rdb redis-shared-master-0:/data/dump.rdb

# Restart pod to reload RDB
kubectl -n storage delete pod redis-shared-master-0
# Redis will load dump.rdb on startup
```

> ⚠️ Redis data is ephemeral cache — for most apps, losing Redis is inconvenient but not catastrophic. Prioritize PostgreSQL backups.
