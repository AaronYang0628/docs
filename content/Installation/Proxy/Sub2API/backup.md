+++
title = "Backup & Restore"
description = "Sub2API database and app-level backup runbook"
+++

### Scope

- Database: PostgreSQL (`database/postgresql-0`), DB `sub2api`
- App config: `manifests/sub2api-argocd.yaml` + `application` namespace Secrets
- Runtime data path: `/app/data` (mounted from PVC `sub2api-data`)

### 72602 S3 Backup Ingress Incident (2026-07-30)

The live S3 endpoint is `https://api.minio.72602.space`; Sub2API uploads its
backups to the `sub2api` bucket. Before correction, ingress-nginx generated
`client_max_body_size 1m` for the MinIO API host. It rejected approximately
2.45 MB `PutObject` requests with HTTP 413 before they reached MinIO, which
caused the AWS SDK XML parser error containing the ingress HTML response.

The source fix is in `manifests/minio-argocd.yaml`, under `apiIngress.annotations`:

```yaml
nginx.ingress.kubernetes.io/proxy-body-size: "0"
```

Commit `2338bc6` was pushed to `main`. The parent `ops-docs` Application
reconciled the child `argocd/minio`; the injected readonly ArgoCD identity
denied manual sync, so the already-committed `storage/minio-api` annotation
was applied narrowly and then verified as `Synced`/`Healthy`. Generated nginx
now contains `client_max_body_size 0`, MinIO is Ready, and a same-endpoint
authenticated temporary S3 PutObject/stat/delete smoke test passed. The
temporary label was confirmed absent after cleanup.

Rollback: revert commit `2338bc6` and push `main`, then allow the parent
Application to reconcile. If the emergency live annotation must be reversed
before reconciliation, remove only
`nginx.ingress.kubernetes.io/proxy-body-size` from `storage/minio-api`.
Do not change the console ingress or delete MinIO Secrets/PVCs.

The actual Sub2API backup was not manually retried: the guarded admin login
returned HTTP 400 before the `POST /api/v1/admin/backups` trigger, so no
backup request was sent. Verify subsequent scheduled/manual results without
printing credentials, tokens, backup data, or object names:

```bash
kubectl -n application logs deploy/sub2api --since=30m
kubectl -n basic-components logs deploy/ingress-nginx-controller --since=30m
kubectl -n storage get ingress minio-api
```

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
