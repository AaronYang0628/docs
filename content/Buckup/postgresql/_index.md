+++
title = 'PostgreSQL'
date = 2026-05-12T15:00:59+08:00
weight = 10
+++

### Prerequisites

```bash
alias pgk='kubectl -n database exec deployment/postgresql --'
```

### 全量备份所有数据库

```bash
pgk pg_dumpall -U postgres > postgresql-full-$(date +%Y%m%d).sql
```

### 备份单个数据库

```bash
pgk pg_dump -U postgres <dbname> > <dbname>-$(date +%Y%m%d).sql
```

### 备份到 PVC 内

```bash
pgk sh -c 'pg_dumpall -U postgres > /bitnami/postgresql/backup-$(date +%Y%m%d).sql'
```

### 从备份文件恢复

```bash
# 全量恢复
cat postgresql-full-20260512.sql | pgk psql -U postgres

# 单库恢复（先创建空库）
pgk psql -U postgres -c "CREATE DATABASE <dbname>;"
cat <dbname>-20260512.sql | pgk psql -U postgres -d <dbname>
```

### 定时备份（CronJob）

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgresql-backup
  namespace: database
spec:
  schedule: "0 3 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: m.daocloud.io/docker.io/bitnami/postgresql:latest
            command:
            - sh
            - -c
            - |
              pg_dumpall -U postgres -h postgresql \
                > /backup/postgresql-$(date +%Y%m%d%H%M).sql
              find /backup -name "*.sql" -mtime +7 -delete
            volumeMounts:
            - name: backup
              mountPath: /backup
          restartPolicy: Never
          volumes:
          - name: backup
            hostPath:
              path: /data/backups/postgresql
```
