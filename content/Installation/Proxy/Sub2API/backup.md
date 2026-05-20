+++
title = "Backup & Restore"
description = "Sub2API database and app-level backup runbook"
+++

### Scope

- Database: PostgreSQL (`database/postgresql-0`), DB `sub2api`
- App config: `ops-assets/sub2api-argocd.yaml` + `ai` namespace secrets
- Runtime data path: `/app/data` (mounted from PVC `sub2api-data`)

### Database Backup

```bash
TS=$(date +%F-%H%M%S)
mkdir -p /home/aaron/Ops/backups/sub2api

kubectl -n database exec postgresql-0 -- \
  env PGPASSWORD='REPLACE_POSTGRES_PASSWORD' \
  pg_dump -U postgres -d sub2api -Fc \
  > /home/aaron/Ops/backups/sub2api/sub2api-${TS}.dump
```

### Database Restore

```bash
# 1) create a restore database first (recommended)
kubectl -n database exec postgresql-0 -- \
  env PGPASSWORD='REPLACE_POSTGRES_PASSWORD' \
  psql -U postgres -d postgres -c "CREATE DATABASE sub2api_restore OWNER sub2api;"

# 2) restore dump to restore database
cat /home/aaron/Ops/backups/sub2api/sub2api-YYYY-MM-DD-HHMMSS.dump | \
kubectl -n database exec -i postgresql-0 -- \
  env PGPASSWORD='REPLACE_POSTGRES_PASSWORD' \
  pg_restore -U postgres -d sub2api_restore --clean --if-exists

# 3) verify key tables
kubectl -n database exec postgresql-0 -- \
  env PGPASSWORD='REPLACE_POSTGRES_PASSWORD' \
  psql -U postgres -d sub2api_restore -c "SELECT count(*) FROM users;"
```

### Sub2API App-Level Backup

```bash
TS=$(date +%F-%H%M%S)
mkdir -p /home/aaron/Ops/backups/sub2api/${TS}

# 1) backup ArgoCD app manifest source
cp /home/aaron/Ops/docs/manifests/application/sub2api-argocd.yaml \
  /home/aaron/Ops/backups/sub2api/${TS}/sub2api-argocd.yaml

# 2) backup in-cluster objects
kubectl -n ai get deploy,svc,ingress,pvc sub2api -o yaml \
  > /home/aaron/Ops/backups/sub2api/${TS}/sub2api-k8s.yaml

kubectl -n ai get secret sub2api-auth -o yaml \
  > /home/aaron/Ops/backups/sub2api/${TS}/sub2api-auth.secret.yaml

kubectl -n ai get secret sub2api-external-postgresql -o yaml \
  > /home/aaron/Ops/backups/sub2api/${TS}/sub2api-external-postgresql.secret.yaml
```

### Pre-Restore Safety Checklist

- Confirm rollback target (`sub2api` or `sub2api_restore`) before switching DB.
- Keep current dump before any restore/import.
- After restore, verify login API and settings API:

```bash
curl -sk -o /dev/null -w '%{http_code}\n' https://sub2api.72602.online/api/v1/settings/public
kubectl -n ai logs deploy/sub2api --since=10m
```
