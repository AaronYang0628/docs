+++
title = 'Minio'
date = 2026-05-12T15:00:59+08:00
weight = 30
+++

### Prerequisites

```bash
alias mc='kubectl -n storage exec deployment/minio -- mc'
mc config host add myminio http://minio.storage.svc:9000 <access-key> <secret-key>
```

### Backup a bucket

```bash
mc mirror myminio/my-bucket ./backups/my-bucket/
```

### Restore a bucket

```bash
mc mirror ./backups/my-bucket/ myminio/my-bucket
```

### Backup all buckets (script)

```bash
for bucket in $(mc ls myminio | awk '{print $NF}'); do
  echo "Backing up $bucket ..."
  mc mirror myminio/$bucket ./backups/$bucket/
done
```

### Scheduled backup (CronJob)

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: minio-backup
  namespace: storage
spec:
  schedule: "0 4 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: m.daocloud.io/docker.io/minio/mc:latest
            command:
            - sh
            - -c
            - |
              mc alias set myminio http://minio.storage.svc:9000 $ACCESS_KEY $SECRET_KEY
              mc mirror myminio/ ./backup/$(date +%Y%m%d)/
            env:
            - name: ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: minio
                  key: root-user
            - name: SECRET_KEY
              valueFrom:
                secretKeyRef:
                  name: minio
                  key: root-password
            volumeMounts:
            - name: backup
              mountPath: /backup
          restartPolicy: Never
          volumes:
          - name: backup
            hostPath:
              path: /data/backups/minio
```
