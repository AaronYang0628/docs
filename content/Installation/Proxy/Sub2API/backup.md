+++
title = "Backup & Restore"
description = "Sub2API pre-upgrade backup and recovery runbook"
+++

### Scope

- Database: PostgreSQL (`database/postgresql-0`), DB/user `sub2api`
- Git source: `manifests/sub2api-argocd.yaml`, owned by `argocd/ops-docs`
- Current release: OCI chart `0.1.22`, application `0.2.16`
- Application image: `ghcr.io/wei-shaw/sub2api@sha256:4a0d0196d3450c71da159137e3419fc144df0c038bbe3b9e87dbbccaef10cab7` (Linux amd64)
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
- `sha256sum -c SHA256SUMS` and `pg_restore --list` both succeeded.
- The captured `origin/main` revision was
  `ce838b424f10316fc604a4a21517c90c7b6b97ae`. No failure occurred; no
  upgrade, Argo CD sync, or GitOps/cluster change was performed.

### Verified upgrade: 2026-09-05 (application 0.2.0)

- Backup directory: `/home/aaron/Ops/backups/sub2api/upgrade-20260905T000035Z`
  (upgrade commit `5230546610c437a02ee45f5b80cd804779c9170c`). The scoped
  `sub2api.dump` (47,520,105 bytes) and `sub2api-data.tgz` (10,192,905 bytes)
  were non-empty; `pg_restore --list` and SHA-256 checks passed.
- `schema_migrations` advanced from 268 to 277 records; the latest migration
  is `233_group_free_openai_fast.sql`.
- ArgoCD reported `Synced/Healthy`; Deployment was 1/1 on the pinned
  `ghcr.io/wei-shaw/sub2api@sha256:271bb3b34661803681cabf54e99811ab8e248b0dd4c88b09ea1226e22dea5751`
  image.
- Existing application and Redis PVCs remained Bound, Service endpoints were
  Ready, and public health/settings checks succeeded.
- No rollback was required.

### Verified upgrade: 2026-09-05 (application 0.2.1)

- Backup directory: `/home/aaron/Ops/backups/sub2api/upgrade-20260905T115349Z-178860`
  (upgrade commit `21d02345de47d75454841e464756f6cf9349cc3c`). The scoped
  `sub2api.dump` and `sub2api-data.tgz` were non-empty; `pg_restore --list` and
  SHA-256 checks passed.
- ArgoCD reported `Synced/Healthy` at `2026-09-05T13:03:41Z`; Deployment was 1/1,
  Pod ready with 0 restarts, internal `/health` returned `{"status":"ok"}`, Service
  endpoint ready, and Redis StatefulSet 1/1.
- Existing application and Redis PVCs remained Bound; health and settings checks
  succeeded.
- No rollback was required.

### Verified upgrade: 2026-09-10

- Backup directory: `/home/aaron/Ops/backups/sub2api/upgrade-20260910T061248Z`; PostgreSQL dump `46,520,009` bytes, `/app/data` archive `10,214,969` bytes; backup artifacts and `pg_restore --list`, archive listing, SHA-256 all passed; GitOps commit `7bd44adb5ed1b61976b507e1f32bc990738782b2`; sub2api ArgoCD target/observed `0.1.14` Synced/Healthy operation Succeeded; runtime verification: Deployment 1/1, Pod ready 0 restarts, chart `sub2api-0.1.14/app 0.2.4`, actual image digest matches, Service endpoint ready/serving, internal `/health` HTTP 200, Redis StatefulSet 1/1.
- No rollback required.

### Verified upgrade: 2026-09-16

- Backup directory: `/home/aaron/Ops/backups/sub2api/upgrade-20260916T053309Z` (directory mode `700`, files mode `600`). PostgreSQL dump `27,593,406` bytes, `/app/data` archive `4,579,406` bytes; backup artifacts and `pg_restore --list`, archive listing, SHA-256 all passed; GitOps commit `e2c0e4576276f6a299bbd27e80f40af883f8e877` (`chore(sub2api): upgrade to chart 0.1.15`); sub2api ArgoCD target/observed `0.1.15` Synced/Healthy operation Succeeded; runtime verification: Deployment 1/1, Pod `sub2api-7c9c4b95bf-r6cpg` Running/Ready, restarts 0, chart `sub2api-0.1.15/app 0.2.5`, actual image digest matches `sha256:4c5dffab6e5ba4d3bd5382f19aad9654847b4e23de1a3d48e190146a3e6eb977`, Service endpoint ready at `10.42.0.198:8080`, internal `/health` HTTP 200 body `{"status":"ok"}`, Redis StatefulSet ready at `10.42.0.12:6379` with 1 historical restart.
- No rollback required.

### Verified upgrade: 2026-09-20 (application 0.2.7)

- Backup directory: `/home/aaron/Ops/backups/sub2api/upgrade-20260920T051850Z`
- Backup artifacts: `sub2api.dump` (29,365,379 bytes, SHA-256 `d9a0fb1870cde3405d47765291190dbc0bf17bd724708dc1fd7f448a8027eace`), `sub2api-data.tgz` (4,598,099 bytes, SHA-256 `f6b1691f6ba771f415e78caebedb0da225ef665a7af22c3b9d9854c6f4e097f7`), `pg_restore --list` (1,210 entries), archive listing (10 entries), checksums passed.
- GitOps commit: `67d8fef5859ec579cee101da22cc4988ca789b84` (`chore: upgrade sub2api`)
- ArgoCD status: `Synced/Healthy`, operation `Succeeded`, observed chart revision `0.1.16`
- Deployment: 1/1 ready; Pod running/ready with 0 restarts
- Service endpoint: `10.42.0.224:8080`
- Internal `/health` HTTP 200 (body discarded)
- Dedicated Redis StatefulSet: 1/1 ready; Redis Pod has 1 historical restart
- No rollback required.

### Verified upgrade: 2026-09-23 (chart 0.1.17 / application 0.2.8)

- Backup directory: `/home/aaron/Ops/backups/sub2api/upgrade-20260923T222508Z`
  (directory mode `700`, files mode `600`). The scoped PostgreSQL dump was
  32,663,617 bytes and the `/app/data` archive was 4,614,791 bytes.
  `pg_restore --list` returned 1,210 entries, the archive listing contained 10
  entries, and all SHA-256 checks passed. The initial streamed validation timed
  out; validation using a controlled temporary file inside the PostgreSQL
  container passed.
- GitOps commit: `646d50010cf39090567098bc819e74b06976a5ef`; only
  `manifests/sub2api-argocd.yaml` changed, from chart `0.1.16` to `0.1.17`.
  Mirror chart PR #8 merged as `87ae24c`. The image digest is
  `sha256:11b2dc8d9ea297c676581daf1322d71200eeed58ebfb5fecf2a991fa2741fb86`.
- ArgoCD parent and child reconciled successfully; Sub2API was `Synced/Healthy`
  on chart `0.1.17`. Deployment was 1/1, the Pod was Ready with 0 restarts, and
  its image ID matched the target digest. The Service endpoint
  `10.42.0.226:8080` was ready; internal and public `/health` checks returned
  HTTP 200. Dedicated Redis was 1/1 with a ready endpoint; both PVCs remained
  Bound.
- Migrations completed without errors. Preflight found 27 non-numeric legacy
  reasoning-effort keys, which migration 239 removed without conversion; one
  existing affiliate-ledger row received a NULL operation ID under migration
  240, with no unique-index conflict.
- Image pull took 10m37s and briefly caused `ProgressDeadlineExceeded`; the
  rollout recovered. Existing pricing-repository timeout warnings remained.
  No rollback was required. Deployment rollback is a new Git revert; migrations
  are forward-only, so database recovery requires an isolated restore and a
  deliberate configuration switch.

### Verified upgrade: 2026-09-28 (chart 0.1.18 / application 0.2.9)

- Backup directory: `/home/aaron/Ops/backups/sub2api/upgrade-20260928T135349Z`
  (directory mode `700`, files mode `600`). The scoped PostgreSQL dump was
  37,222,935 bytes with 1,214 `pg_restore --list` entries; the `/app/data`
  archive was 4,631,639 bytes with 10 entries. SHA-256 checks passed, and the
  captured `origin/main` revision was
  `622ea9171286d9e218bd15a9569ce8c1b565d48b`.
- GitOps commit: `b37fe3549cc8c65bba6d268c45ffdda97f86d9ca`
  (`chore(sub2api): upgrade to chart 0.1.18`); only
  `manifests/sub2api-argocd.yaml` changed, from chart `0.1.17` to `0.1.18`.
  Mirror chart PR #9 merged as `a748960`; the published chart `0.1.18` was
  anonymously pulled back with package SHA-256
  `196406aa97b89ff747cc0317ad71d2eaa3b22adbc0057c7d4aec2ec126ad35e4` matching
  Git. The image digest is
  `sha256:996a0ea43500550f233a2f653de58dcd77f42d3e244805894fcccdd32b612147`.
- ArgoCD synced Sub2API to chart `0.1.18` at `2026-09-28T13:58Z`
  (operation `Succeeded`) and reported `Synced/Healthy` by `14:00Z`.
  Deployment was 1/1, Pod `sub2api-8c7fbd445-bhhnp` Ready with 0 restarts,
  and its image ID matched the target digest exactly. The Service endpoint
  `10.42.0.239:8080` was ready; internal `/health` returned
  `{"status":"ok"}` and public `https://token.72602.space/health` returned
  HTTP 200. Dedicated Redis was 1/1 and both PVCs remained Bound.
- Application 0.2.9 introduced no new database migrations: the latest applied
  migration remains `240_affiliate_ledger_operation_id.sql` (applied
  2026-09-23) and `schema_migrations` holds 289 records. No migration or
  startup errors appeared in the logs; the rollout completed in about two
  minutes without `ProgressDeadlineExceeded`.
- No rollback was required. Deployment rollback is a new Git revert;
  migrations are forward-only, so database recovery requires an isolated
  restore and a deliberate configuration switch.

### Verified upgrade: 2026-10-01 (chart 0.1.19 / application 0.2.11)

- Backup directory: `/home/aaron/Ops/backups/sub2api/upgrade-20261001T001943Z`
  (outside the repository). Only the `sub2api` PostgreSQL database and
  `application/sub2api-data` PVC (`/app/data`) were backed up. `sub2api.dump`
  is 38,717,665 bytes (SHA-256
  `bd4b8663b645e24058a034342b8b1b1fa58f2475fbc5b84a94f79cc509c3ca83`);
  `sub2api-data.tgz` is 4,638,794 bytes (SHA-256
  `f2917628f296013f8062891c18172d8116e2f488a5a9466deda463f19989a0d9`). Both
  artifacts are non-empty and mode `600`; `pg_restore --list` returned 1,214
  entries and the tar listing returned 10 entries.
- Published OCI chart `0.1.19` is anonymously pullable; package SHA-256
  `3bd25eb5b5cdf69c6980e688db9730db86d72f6129315af9eb085c94a8c9dc89` matched
  Git. GitOps `targetRevision` is `0.1.19`, from commit
  `b805c440d53daa4f90706b028a5457de7e0790ae`.
- ArgoCD reported `Synced/Healthy`. Deployment rollout was 1/1 ready and
  available; the Pod was Ready with 0 restarts, and the running image digest
  matched Linux amd64 image
  `ghcr.io/wei-shaw/sub2api@sha256:9a71717a6f82efe663b613c730069ad427a2beee38bd16663346ae1c27a6cbc1`.
- Service ClusterIP is `10.43.88.246:8080`, with endpoint
  `10.42.0.70:8080`. Internal `/health` returned HTTP 200 with
  `{"status":"ok"}`. Dedicated Redis was 1/1 ready at `10.42.0.12:6379`;
  its one historical restart is not a current health issue.
- No rollback was required. Roll back deployment configuration with a new Git
  revert to chart `0.1.18`; do not use `kubectl rollout undo`. Migrations are
  forward-only. Database rollback requires restoring into an isolated database
  and making a deliberate configuration switch.

### Verified upgrade: 2026-10-02 (chart 0.1.20 / application 0.2.13)

- Fresh backup directory: `/home/aaron/Ops/backups/sub2api/upgrade-20261002T154620Z`
  (outside the repository; directory mode `700`, files mode `600`). Only the
  `sub2api` database and PVC `application/sub2api-data` mounted at `/app/data`
  were backed up; exactly two artifacts were created. `sub2api.dump` is
  39,995,006 bytes (SHA-256
  `b749ec86ec5aa6244780edeb29b1a7e82fd7cd87881b9d971a5cf6aaf408d2ef`), with
  1,214 `pg_restore --list` entries. `sub2api-data.tgz` is 4,644,880 bytes
  (SHA-256
  `c312329d676c8eab04f87e419ab00a68d6636460bcbe80c650d4028951396160`), with
  10 tar listing entries.
- GitOps commit `18c5010062fbb9a1b22450ff3fb8b055f91fa2b1` changed only
  `targetRevision` from `0.1.19` to `0.1.20`. Published chart `0.1.20` is
  application `0.2.13`; package SHA-256
  `b681c230a96ad93ef24a17946fdcb867cad4dae4ac319b70258258bb01b19b6b` and OCI
  manifest digest
  `sha256:60d44de5e929d2c4f3fe0a1d6d3b02d5e8597acd7fdaf99e5a02cf08e27a8e34`.
  An independent anonymous pull matched the Git archive.
- ArgoCD operation `Succeeded`, `Synced/Healthy`; sync completed at
  `2026-10-02T15:57:26Z` and Healthy was reported at `16:01:36Z`. Deployment
  was 1/1 ready and available; Pod `sub2api-c98d8b48b-dmzwg` was Ready/Running
  with 0 restarts, and the running image digest matched Linux amd64 image
  `ghcr.io/wei-shaw/sub2api@sha256:834172e90a5e51ae29afc9f93ec13235768eaad77497bc8c83274c141cd55759`.
- Service ClusterIP `10.43.88.246:8080` had endpoint `10.42.0.74:8080`;
  internal `/health` returned HTTP 200 with `{"status":"ok"}`. Dedicated Redis
  StatefulSet was 1/1 with ready endpoint `10.42.0.12:6379`; its Pod has one
  historical restart.
- No rollback was required. Deployment rollback is a new Git revert to chart
  `0.1.19`; do not use `kubectl rollout undo`. Database migrations are
  forward-only, so database rollback requires restoring into an isolated
  database and making a deliberate configuration switch.

### Verified upgrade: 2026-10-14 (chart 0.1.22 / application 0.2.16)

- Backup directory: `/home/aaron/Ops/backups/sub2api/upgrade-20261014T123853Z`
  (outside the repository; directory mode `700`). Exactly two files, both mode
  `600`: `sub2api.dump` (52,013,200 bytes, SHA-256
  `7e3bf6693e21a9ea644cccda36f85f03f506bd1a4dac7bd589118551b7272d8f`) and
  `sub2api-data.tgz` (4,674,990 bytes, SHA-256
  `1b68a4c9af54fe032c582e51eee5f039d8b9594a9592441e31e7d2893b164f75`). The
  dump covered only database/user `sub2api` on `database/postgresql-0`; the
  archive covered only `application/sub2api-data` mounted at `/app/data`.
  `pg_restore --list` passed with 1,214 entries, the archive listing passed
  with 10 entries, and SHA-256 recomputation passed. Initial streamed restore
  listing timed out; the pod-local temporary-file fallback passed and the
  temporary file was removed.
- Chart mirror PR #13 merged as `440034baaaac6efc56eba1ae8c906a475f5f1518`.
  Package SHA-256 was
  `718ff8e75d4e803d351da82e2d02161a86ac85178b8e569ce6b98f241672dccb`; an
  independent anonymous Helm pull matched. GHCR OCI manifest digest was
  `sha256:4f3fdb5942b218717099821597b29324f98400256adc560e11cc0b7922372fc8`.
  Chart CI, Mirror consistency CI, Publish Sub2API chart, and Pages workflows
  succeeded. GitOps commit `ff542ee8a14d2615233281cf6886ddc5ab8a59e9` changed
  only `targetRevision` from `0.1.21` to `0.1.22`.
- Parent `ops-docs` was `Synced/Healthy` at that commit, operation
  `Succeeded`. Child `sub2api` target and observed chart were `0.1.22`,
  `Synced/Healthy`, operation `Succeeded`. Deployment rollout finished with
  desired/updated/ready/available `1/1/1/1`, unavailable `0`; Pod
  `sub2api-c8d4cd46d-5lb4z` was Running/Ready with 0 restarts, and its live
  image ID matched Linux amd64 image
  `ghcr.io/wei-shaw/sub2api@sha256:4a0d0196d3450c71da159137e3419fc144df0c038bbe3b9e87dbbccaef10cab7`.
- Ready/serving Service endpoint was `10.42.0.55:8080`; internal `/health`
  returned HTTP 200 with `{"status":"ok"}`. Dedicated Redis StatefulSet and
  Pod were 1/1 ready. Redis had 2 historical restarts; last termination was
  2026-10-07 with exit 255, with no current Redis errors.
- Non-fatal observations: one startup timeout fetching the remote model-price
  hash, security allowlist warnings, and a historical readiness failure from
  the replaced Pod. No migration failure was observed; no specific migration
  is asserted. No rollback was required. Roll back the GitOps release with a
  new Git revert to chart `0.1.21`; a true database rollback requires restoring
  the dump into an isolated database and making a deliberate configuration
  switch. Never use `kubectl rollout undo` as a database rollback.

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
