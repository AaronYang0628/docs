+++
title = 'K8S App Pass'
date = 2024-03-20T19:58:45+08:00
draft = true
+++

### ArgoCD
```shell
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

### Clickhouse
```shell
kubectl -n database get secret clickhouse-admin-credentials -o jsonpath='{.data.password}' | base64 -d
```

### MariaDB
```shell
kubectl -n application get secret mariadb-credentials -o jsonpath='{.data.mariadb-root-password}' | base64 -d
```

### Postgresql
```shell
kubectl -n application get secret postgresql-credentials -o jsonpath='{.data.postgres-password}' | base64 -d
```

### Redis
```shell
kubectl -n application get secret redis-credentials -o jsonpath='{.data.redis-password}' | base64 -d
```

### Minio
```shell
kubectl -n storage get secret minio-secret -o jsonpath='{.data.rootPassword}' | base64 -d
```