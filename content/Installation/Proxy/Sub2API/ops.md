+++
title = "Ops"
description = "Daily operations for sub2api"
+++

### Web Page
[<i class="fa-solid fa-link"></i> sub2api web page (https://sub2api.72602.online)](https://sub2api.72602.online)

### Health Check

```bash
argocd app get sub2api
kubectl -n ai get pods
kubectl -n ai logs deploy/sub2api --tail=80
```

### Ingress and TLS

```bash
kubectl -n ai get ingress sub2api -o wide
kubectl -n ai get certificate,certificaterequest,order,challenge
curl -vkI https://sub2api.72602.online
```

### Restart

```bash
kubectl -n ai rollout restart deploy/sub2api
kubectl -n ai rollout status deploy/sub2api
```

### Rotate Auth Secrets

```bash
kubectl -n ai create secret generic sub2api-auth \
  --from-literal=admin-password='CHANGE_ME_STRONG_PASSWORD' \
  --from-literal=jwt-secret="$(openssl rand -hex 32)" \
  --from-literal=totp-encryption-key="$(openssl rand -hex 32)" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl -n ai rollout restart deploy/sub2api
```

### Sync From ArgoCD

```bash
ARGOCD_PASS=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)
argocd login --insecure --username admin argocd.72602.online --password $ARGOCD_PASS

argocd app sync sub2api
argocd app wait sub2api --health --timeout 300
```

### Backup and Restore

- Database + app-level backup runbook: `Ops/Sub2API/Backup & Restore`
- File path: `/home/aaron/Ops/docs/content/Installation/Application/Sub2API/backup.md`

### Troubleshooting: `column settings.id does not exist`

Symptom: `GET /api/v1/settings/public` or admin settings APIs return `500`, logs show `pq: column settings.id does not exist`.

Root cause: sub2api is pointed to a shared/legacy database schema (for example `n8n` DB) where `settings` table structure is incompatible.

Fix (minimal):

```bash
# 1) use dedicated DB/user for sub2api
# update /home/aaron/Ops/docs/manifests/application/sub2api-argocd.yaml
# externalPostgresql.username= sub2api
# externalPostgresql.database= sub2api

# 2) create DB/user in PostgreSQL and rotate secret
# (run with postgres superuser)

# 3) apply and rollout
kubectl apply -f /home/aaron/Ops/docs/manifests/application/sub2api-argocd.yaml
kubectl -n ai rollout restart deploy/sub2api
kubectl -n ai rollout status deploy/sub2api
```

### Troubleshooting: Redis `WRONGPASS`

Symptom: `kubectl -n ai logs deploy/sub2api` shows `WRONGPASS invalid username-password pair`.

Root cause: Redis password changed (for example chart regenerated secret), but `sub2api` pod still used old `REDIS_PASSWORD` env var.

Fix:

```bash
# 1) ensure ArgoCD values pin Redis secret (in sub2api-argocd.yaml)
# redis.auth.existingSecret: sub2api-redis
# redis.auth.existingSecretPasswordKey: redis-password

# 2) apply and restart sub2api to reload env
kubectl apply -f /home/aaron/Ops/docs/manifests/application/sub2api-argocd.yaml
kubectl -n ai rollout restart deploy/sub2api
kubectl -n ai rollout status deploy/sub2api

# 3) verify
kubectl -n ai logs deploy/sub2api --tail=120
```

Verify:

```bash
curl -sk -o /dev/null -w '%{http_code}\n' https://sub2api.72602.online/api/v1/settings/public
kubectl -n ai logs deploy/sub2api --since=10m
```
