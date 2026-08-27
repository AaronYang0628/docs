+++
title = "Backup & Restore"
description = "Sub2API pre-upgrade backup and recovery runbook"
+++

### Scope

- Database: PostgreSQL (`database/postgresql-0`), DB/user `sub2api`
- Git source: `manifests/sub2api-argocd.yaml`, owned by `argocd/ops-docs`
- Current release: OCI chart `0.1.8`, image `ghcr.io/wei-shaw/sub2api:0.1.176`
- Runtime data: `application/sub2api-data`, `10Gi`, `local-path`, `RWO`
- Redis data: `8Gi`, `local-path`, `RWO`; AOF is enabled
- Runtime Secrets: `application/sub2api-auth`,
  `application/sub2api-external-postgresql`, and `application/sub2api-redis`

Sub2API executes PostgreSQL migrations automatically on startup. Migrations are
forward-only, so every chart or image upgrade requires a verified `pg_dump`
before the Git version change.

### Pre-Upgrade Backup

<p> <b>1.create</b> a protected operation directory </p>

```bash
BACKUP_ROOT=/home/aaron/Ops/backups/sub2api
BACKUP_DIR="${BACKUP_ROOT}/upgrade-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
printf '%s\n' "$BACKUP_DIR"
```

Use the generated UTC directory for the entire operation. Do not hard-code a
previous operation timestamp into future commands.

<p> <b>2.dump</b> PostgreSQL without printing its password </p>

```bash
set +x
PG_PASSWORD="$(kubectl -n application get secret \
  sub2api-external-postgresql \
  -o jsonpath='{.data.postgres-password}' | base64 -d)"
test -n "$PG_PASSWORD"

printf '%s\n' "$PG_PASSWORD" | \
  kubectl -n database exec -i postgresql-0 -- \
  sh -c 'IFS= read -r PGPASSWORD; export PGPASSWORD; exec pg_dump -U sub2api -d sub2api -Fc' \
  > "$BACKUP_DIR/sub2api.dump"

unset PG_PASSWORD
```

The password is passed on stdin and is not written into the backup directory.

<p> <b>3.capture</b> application data and non-secret metadata </p>

```bash
kubectl -n application exec deployment/sub2api -- \
  tar -C /app/data -czf - . > "$BACKUP_DIR/sub2api-data.tgz"

git -C /home/aaron/Ops/docs fetch origin main
git -C /home/aaron/Ops/docs rev-parse origin/main \
  > "$BACKUP_DIR/git-revision.txt"
git -C /home/aaron/Ops/docs show origin/main:manifests/sub2api-argocd.yaml \
  > "$BACKUP_DIR/sub2api-argocd.yaml"

kubectl -n application get pvc \
  -l app.kubernetes.io/instance=sub2api -o yaml \
  > "$BACKUP_DIR/pvc-metadata.yaml"
```

Do not export Kubernetes Secret objects into this directory. Back up Secret
values only through the approved secret-management process. Redis AOF supports
restart recovery on its PVC, but it is not a substitute for the PostgreSQL
dump. Do not copy live AOF files as if they were a consistent database backup.

<p> <b>4.verify</b> artifacts before upgrading </p>

```bash
test -s "$BACKUP_DIR/sub2api.dump"
test -s "$BACKUP_DIR/sub2api-data.tgz"

kubectl -n database exec -i postgresql-0 -- pg_restore --list \
  < "$BACKUP_DIR/sub2api.dump" \
  > "$BACKUP_DIR/sub2api.dump.list"
test -s "$BACKUP_DIR/sub2api.dump.list"

sha256sum \
  "$BACKUP_DIR/sub2api.dump" \
  "$BACKUP_DIR/sub2api-data.tgz" \
  "$BACKUP_DIR/sub2api-argocd.yaml" \
  "$BACKUP_DIR/pvc-metadata.yaml" \
  "$BACKUP_DIR/git-revision.txt" \
  > "$BACKUP_DIR/SHA256SUMS"
sha256sum -c "$BACKUP_DIR/SHA256SUMS"
```

### Verified backup: 2026-08-14

- Backup directory: `/home/aaron/Ops/backups/sub2api/upgrade-20260814T063611Z`
  (directory mode `700`, files mode `600`). Only the shared PostgreSQL
  `sub2api` database was dumped; n8n and other databases were not touched.
- The host had no `pg_restore`; PostgreSQL Pod `database/postgresql-0` had
  `pg_restore 18.3` and GNU `tar 1.34`. The dump was copied temporarily with
  `kubectl cp`, checked with Pod-local `pg_restore --list`, and the temporary
  Pod file was removed. The previous `kubectl exec -i` streaming validation was
  not reused.
- Non-empty artifacts: `sub2api.dump` (19,640,824 bytes),
  `sub2api-data.tgz` (10,616,251 bytes), and `sub2api.dump.list` (77,853
  bytes). Git revision, manifest, and PVC metadata were also captured.
- `sha256sum -c SHA256SUMS` and `pg_restore --list` both succeeded. The
  captured `origin/main` revision was
  `ce838b424f10316fc604a4a21517c90c7b6b97ae`. No failure occurred; no
  upgrade, Argo CD sync, or GitOps/cluster change was performed.

### Restore PostgreSQL Safely

Restore into a separate database first. Do not overwrite the live `sub2api`
database during an upgrade rollback.

<p> <b>1.create</b> the restore database </p>

```bash
BACKUP_DIR=/home/aaron/Ops/backups/sub2api/<approved-backup-directory>
test -s "$BACKUP_DIR/sub2api.dump"

set +x
read -rsp 'PostgreSQL admin password: ' POSTGRES_ADMIN_PASSWORD; printf '\n'
test -n "$POSTGRES_ADMIN_PASSWORD"

printf '%s\n' "$POSTGRES_ADMIN_PASSWORD" | \
  kubectl -n database exec -i postgresql-0 -- \
  sh -c 'IFS= read -r PGPASSWORD; export PGPASSWORD; exec createdb -U postgres -O sub2api sub2api_restore'

unset POSTGRES_ADMIN_PASSWORD
```

<p> <b>2.restore and verify</b> with the application database user </p>

```bash
set +x
PG_PASSWORD="$(kubectl -n application get secret \
  sub2api-external-postgresql \
  -o jsonpath='{.data.postgres-password}' | base64 -d)"
test -n "$PG_PASSWORD"

{ printf '%s\n' "$PG_PASSWORD"; cat "$BACKUP_DIR/sub2api.dump"; } | \
  kubectl -n database exec -i postgresql-0 -- \
  sh -c 'IFS= read -r PGPASSWORD; export PGPASSWORD; exec pg_restore -U sub2api -d sub2api_restore --exit-on-error --no-owner --no-privileges'

printf '%s\n' "$PG_PASSWORD" | \
  kubectl -n database exec -i postgresql-0 -- \
  sh -c 'IFS= read -r PGPASSWORD; export PGPASSWORD; exec psql -U sub2api -d sub2api_restore -c "\\dt"'

unset PG_PASSWORD
```

<p> <b>3.switch</b> only through a reviewed Git recovery change </p>

Change `externalPostgresql.database` to `sub2api_restore` in
`manifests/sub2api-argocd.yaml`, commit and push the reviewed recovery change,
then reconcile `ops-docs` and `sub2api`. Restore `sub2api-data` only during a
planned maintenance window with the workload quiesced; never extract the
archive over a running Pod.

```bash
argocd app get ops-docs --hard-refresh
argocd app sync ops-docs --revision main
argocd app wait ops-docs --sync --health --timeout 300
argocd app sync sub2api
argocd app wait sub2api --sync --health --timeout 600

curl -fsS https://token.72602.space/health
curl -fsS https://token.72602.space/api/v1/settings/public
kubectl -n application logs deployment/sub2api --since=10m
```

Do not use `kubectl rollout undo`, delete PVCs, or delete Secrets as restore or
rollback steps.

### App-Level S3 Backup Check

The live S3 endpoint is `https://api.minio.72602.space`, and Sub2API uses the
`sub2api` bucket. The MinIO API Ingress source keeps
`nginx.ingress.kubernetes.io/proxy-body-size: "0"` scoped to that API host so
backup uploads are not rejected by the default 1 MiB ingress limit. Verify a
scheduled or manual backup from logs without printing credentials, tokens,
object names, or backup content:

```bash
kubectl -n application logs deployment/sub2api --since=30m
kubectl -n basic-components logs deployment/ingress-nginx-controller --since=30m
kubectl -n storage get ingress minio-api
```
