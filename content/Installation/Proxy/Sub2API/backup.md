+++
title = "Backup & Restore"
description = "Sub2API pre-upgrade backup and recovery runbook"
+++

### Scope

- Database: PostgreSQL (`database/postgresql-0`), DB/user `sub2api`
- Git source: `manifests/sub2api-argocd.yaml`, owned by `argocd/ops-docs`
- Current release: OCI chart `0.1.31`, application `0.2.26`
- Application image: `ghcr.io/wei-shaw/sub2api@sha256:4499efd416ae3b6345c71fbd85886473395baa2c6396cbd8af8705b6bb476a26`
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

### Verified upgrade: 2026-10-17 (chart 0.1.23 / application 0.2.17)

- Backup directory: `/home/aaron/Ops/backups/sub2api/upgrade-20261017T113820Z`
  (outside the repository; directory mode `700`, exactly two files, both mode
  `600`). The dump covered only database/user `sub2api` on
  `database/postgresql-0`; the archive covered only PVC
  `application/sub2api-data` mounted at `/app/data`. `sub2api.dump` was
  56,376,226 bytes (SHA-256
  `ac06be760091e3a108c2bf0d11cd33d3a2fd2f9a1ae5cfdc10c20600a427dde3`), and
  `sub2api-data.tgz` was 4,682,008 bytes (SHA-256
  `124c5dbc2402fd289a5f5dea293970ab3d02910f12038f41daa213b5a36cc8fb`).
  `pg_restore --list` returned 1,226 entries; the archive listing had 10
  entries; both checksums passed.
- Chart mirror PR #14 merged as `b1668e30bc274ef7a7d5f72ac0ea8a1193b96984`.
  Package SHA-256 was
  `f4095a555c294065e5c409568435a8d80f04fe5ba025e0672dc84c153302b690`; an
  independent anonymous Helm pull matched. OCI manifest digest was
  `sha256:416a1256412bbe72d9daf472a1a29e43f412552f1cc1d96471950317a038f8e9`.
  Chart CI #48, Mirror consistency CI #39, Publish Sub2API chart #14, and Pages
  #115 succeeded. GitOps commit
  `7b7c409b58c8f4e93c5d167ef7920ba0ead3cc82` changed only `targetRevision`
  from `0.1.22` to `0.1.23`.
- Parent `ops-docs` observed that commit and was `Synced/Healthy`, operation
  `Succeeded`. Child `sub2api` target and observed chart were `0.1.23`,
  `Synced/Healthy`, operation `Succeeded`. Deployment desired/updated/ready/
  available counts were `1/1/1/1`; Pod `sub2api-68ff596d85-58pkb` was
  Running/Ready with 0 restarts and its image ID matched Linux amd64 image
  `ghcr.io/wei-shaw/sub2api@sha256:3578ce8dcddd4befa6817448472166f1501120f7876029c641de698a1a8e2ee7`.
- The Service had one ready/serving TCP `8080` endpoint and internal `/health`
  returned HTTP 200. Redis StatefulSet and Pod were 1/1 ready; its 2 restarts
  are historical, and master and headless endpoints were ready/serving.
- Observations: one historical readiness warning on the replaced Pod during
  rollout. The bounded log tail contained one unclassified error-like line,
  but no migration-like entries, timeout, connection-refused, or sensitive-
  keyword errors. No current rollout failure was observed. These observations
  do not establish which migration ran or migration success. No rollback was
  required. A release rollback is a new Git revert to chart `0.1.22`; database
  rollback requires restoring the dump into an isolated database and
  deliberately switching configuration. Do not use `kubectl rollout undo` as
  a database rollback.

### Verified upgrade: 2026-10-29 (chart 0.1.24 / application 0.2.19)

- Backup directory: `/home/aaron/Ops/backups/sub2api/upgrade-20261029T034912Z`
  (outside the repository). Exactly two files were created:
  `sub2api.dump` (71,124,292 bytes, SHA-256
  `c34138082011c0ac67334ff5f7c48c970d836e94d21be43dbb5b8f673f342319`) and
  `sub2api-data.tgz` (4,701,059 bytes, SHA-256
  `0b4fda8516b168f5a063f6aa9896aab22786f56717add37fb33149ce33a9dee4`).
  `pg_restore --list` showed 1,226 entries and the tar archive listing showed
  10 entries.
- GitOps commit `a3894400e43bb9488c1bc364398310515e378296` changed only
  `targetRevision`, from chart `0.1.23` to `0.1.24`. The application image was
  `ghcr.io/wei-shaw/sub2api@sha256:b5a90edf9f3798eafa7a0b4b2b6ebc47036ff45ac475ff6186ea28812d9e0555`.
- ArgoCD reported `Synced/Healthy`, operation `Succeeded`. Deployment was
  1/1; the Pod was Ready with 0 restarts and used the target image digest.
  The ready Service endpoint was `10.42.0.61:8080`; internal `/health`
  returned `{"status":"ok"}`. The dedicated Redis StatefulSet and Pod were
  1/1 Ready at endpoint `10.42.0.16:6379`.
- The ArgoCD CLI token had expired, so verification used Kubernetes Application
  status only. No migration details are asserted.
- No rollback was required. To roll back the release, create a Git revert of
  `a3894400e43bb9488c1bc364398310515e378296`; this restores chart `0.1.23` and
  lets ArgoCD reconcile. A database restore is separate: restore the backup
  only into an isolated database, verify it, then make a deliberate reviewed
  configuration switch. Do not use `kubectl rollout undo` as a database
  rollback.

### Verified upgrade: 2026-11-08 (chart 0.1.25 / application 0.2.20)

- Backup directory: `/home/aaron/Ops/backups/sub2api/upgrade-20261108T023944Z`
  (outside the repository; directory mode `700`, exactly two files, both mode
  `600`). `sub2api.dump` was 78,577,025 bytes (SHA-256
  `176322036de80b940f00b0975a8a6c6fee0ba31c7c130f8788ebc106834bd0b6`);
  `sub2api-data.tgz` was 4,817,192 bytes (SHA-256
  `bace923f7bbaf2132672495299eb67214ba090d55702fb83793da6374500acd4`).
  `pg_restore --list` returned 1,231 entries, the archive listing returned 10
  entries, and checksums passed.
- Mirror PR #16 merged as `ec3138c2beb645cc8db11b4072a952b530f574cf`.
  GHCR Publish Sub2API chart and Pages workflows succeeded. An independent
  anonymous Helm pull matched Git package SHA-256
  `d10eefce7d341261840a67486205791dd0b87c9f40bb7d2a1dd3e3d69eefd396`; OCI
  manifest digest was
  `sha256:8e0154dcb9af076835444f2dba419d2ca06db71e58a5e3728ef9cd41bb69fb81`.
  GitOps commit `4f15af66e6257beb6500347ee8ea2107bf379868` changed only
  `targetRevision`, from `0.1.24` to `0.1.25`.
- Parent `ops-docs` observed the current main commit and was `Synced/Healthy`.
  Child `sub2api` target and observed chart were `0.1.25`, `Synced/Healthy`,
  operation `Succeeded`. Deployment was 1/1; Pod
  `sub2api-75894b5886-6hm86` was Ready with 0 restarts and its image digest
  matched Linux amd64 image
  `ghcr.io/wei-shaw/sub2api@sha256:e5da8d1e51cd97fab4464cdfa4e54a1466ecb470ca5ce6d4e740ebeaeef714a0`.
- Ready Service endpoint was `10.42.0.76:8080`; internal `/health` returned
  HTTP 200 with `{"status":"ok"}`. Dedicated Redis was 1/1 Ready at
  `10.42.0.16:6379`; both application PVCs remained Bound.
- No migration details were verified, and no rollback was required. To roll
  back the deployment, create a Git revert of
  `4f15af66e6257beb6500347ee8ea2107bf379868` to chart `0.1.24` and let ArgoCD
  reconcile. Database restoration is separate: restore into an isolated
  database, verify it, then make a deliberate reviewed configuration switch.
  Do not use `kubectl rollout undo` as a database rollback.

### Verified upgrade: 2026-11-11 (chart 0.1.26 / application 0.2.21)

- Fresh backup directory: `/home/aaron/Ops/backups/sub2api/upgrade-20261111T052550Z`
  (outside the repository; directory mode `700`). Scope was only the `sub2api`
  PostgreSQL database and mounted `/app/data` PVC. `sub2api.dump` was
  81,899,473 bytes (SHA-256
  `dd35796baf399aaf862695e92af26e5581365fb5cc47db5f6f570abb4a486fff`, mode
  `600`); `pg_restore --list` returned 1,247 entries. `sub2api-data.tgz` was
  4,844,655 bytes (SHA-256
  `d51101aca2a94d4b76cd691103fb854aaf32ec7a8c450a14053c35a7cff17a91`, mode
  `600`); tar listing returned 10 entries. Local `pg_restore` was unavailable
  and an initial stdin validation timed out; final in-container verification
  passed.
- Published image:
  `ghcr.io/wei-shaw/sub2api@sha256:cb10d92e89b37c1b732ab6f66cd0bb2164cc8d2d49004e7b9301c1c3d5f1a4a5`.
  Mirror PR #17 merged as `1f12535c33d6602996cd34adc8222147244ee5ff`;
  package SHA-256 was
  `2c2c87dc8d8a362a7ef64632c8ec7eae1467f8358863b4afbb0e2925f3f1ff98`.
  Anonymous OCI pull returned Helm OCI digest
  `sha256:c380e605b8b0fae4bbc8f85976a160314ce1551329a767ee4972d3bbdd2e32aa`,
  matching the repository package. Pages index and catalog show the release.
  GitOps commit `915e943088010bc50448aac8c8e9e71d8d21bd43` changed only
  `targetRevision` from `0.1.25` to `0.1.26`.
- ArgoCD was `Synced/Healthy`. Deployment was 1/1; Pod
  `sub2api-76bc4bd684-sth24` was Ready with 0 restarts and the expected image
  digest. Service endpoint `10.42.0.111:8080` was ready; internal and public
  `/health` returned `{"status":"ok"}`. Dedicated Redis was 1/1 Ready at
  `10.42.0.16:6379`.
- No migration details are asserted. Release rollback is a Git revert of
  `915e943088010bc50448aac8c8e9e71d8d21bd43`. A database rollback requires
  restoring into an isolated database followed by a deliberate configuration
  switch.

### Verified upgrade: 2026-11-17 (chart 0.1.27 / application 0.2.22)

- Fresh backup directory: `/home/aaron/Ops/backups/sub2api/upgrade-20261117T034627Z`
  (outside the repository; directory mode `700`). Scope was only the `sub2api`
  database and mounted `/app/data` PVC. `sub2api.dump` was 84,211,688 bytes
  (SHA-256
  `241fcdea5ef884d6c42fb876044d42c33e4a9fa1b2a163e8aaa1be23b6b8610b`, mode
  `600`); pod-local `pg_restore --list` returned 1,252 entries.
  `sub2api-data.tgz` was 4,916,797 bytes (SHA-256
  `0f97e23dc46065daf7678c9cc89e732378b222fdba0ddafa20454a48627c183c`, mode
  `600`); archive listing returned 10 entries.
- Mirror PR #18 merged as `7413411632d4e32d6a33d7bc52db579b03493134`. Chart
  package SHA-256 was
  `59672be451e6152009801c4cccdb2aa20afe95446a41f894b38963b0c39e52a3`; the
  anonymous OCI pull manifest digest was
  `sha256:a93e2f41274e4cfaa659b1dd041dd0b8751b04778b5d1f5ff1e905783bcb7d06`.
  Chart CI, mirror CI, publish, and Pages workflows succeeded; the Pages index
  and catalog updated. GitOps commit
  `5df6a6074f4486d0f216747320543586b4e2582f` changed only `targetRevision`
  from `0.1.26` to `0.1.27`.
- ArgoCD was `Synced/Healthy`, observed chart `0.1.27`, automated sync
  `Succeeded`. Deployment was 1/1; Pod `sub2api-7895b77c-qtnhn` was Ready with
  0 restarts and the expected image
  `ghcr.io/wei-shaw/sub2api@sha256:459cb6072321d509531d4f85bbeecd8a3709ca24c0bbcf576d7aebcf5d6a4ff9`.
  Service endpoint `10.42.0.193:8080`; internal and public `/health` returned
  HTTP 200 with `{"status":"ok"}`. Dedicated Redis was 1/1 Ready at
  `10.42.0.16:6379`; PVCs were Bound.
- No Warning events were found for the new Sub2API Pod or Deployment. Rollout
  briefly waited for the old replica to terminate. Redis has two historical
  restarts, unchanged. No migration details are asserted. Release rollback is
  a new Git revert of `5df6a6074f4486d0f216747320543586b4e2582f`; database
  rollback requires an isolated restore and deliberate configuration switch.

### Verified upgrade: 2026-11-18 (chart 0.1.28 / application 0.2.23)

- Fresh backup directory: `/home/aaron/Ops/backups/sub2api/upgrade-20261118T082622Z`
  (outside the repository; directory mode `700`, both files mode `600`). Scope
  was only the Sub2API PostgreSQL database and `/app/data`. `sub2api.dump` was
  84,855,058 bytes (SHA-256
  `0bf3323fd380986b70f6ad772a3bcb336cd694fb55da93d7b23df55ce54b5e50`);
  `pg_restore --list` passed with 1,258 entries. `sub2api-data.tgz` was
  4,925,430 bytes (SHA-256
  `58a339e9fa9d2bec28f87a91390341379e76abebc6a789bbe9a116c44e488393`); archive
  listing returned 10 entries. The temporary validation copy was removed.
- Mirror PR #19 merged as `13c68a083ef0139d02f36ca246ff7ddf9fda2209`. Chart CI
  and Mirror CI passed; publish workflow #44265593722 and Pages workflow
  #44265594131 succeeded. An anonymous chart pull returned manifest digest
  `sha256:5d8325234cd55647be4db03132a4d3ee58b45819fbe51eabb9dcc441bd53bb23`;
  package SHA-256 was
  `d1c66a7aca80918b15034eb3d52ad89fe4b19fb50114fb333d1798b30863fbe1`. The
  public index and catalog list `0.1.28` / `0.2.23`. GitOps commit
  `5dc7236f46c7a62b7474c56e5420b27091e8fb67` changed only
  `manifests/sub2api-argocd.yaml`, from targetRevision `0.1.27` to `0.1.28`.
- Parent and child ArgoCD Applications were `Synced/Healthy`; the Sub2API
  operation succeeded. Deployment was 1/1. Pod `sub2api-5c9457446-lxs5m` had
  0 restarts and the expected image digest. The Service had a ready endpoint;
  internal and public `/health` returned HTTP 200 with `{"status":"ok"}`.
  Ingress/TLS were ready, dedicated Redis was 1/1 with a ready endpoint,
  PostgreSQL was Ready, and application and Redis PVCs were Bound. Replacement
  events were normal; Redis had two historical restarts. No migration details
  are asserted.
- Release rollback is a new Git revert of
  `5dc7236f46c7a62b7474c56e5420b27091e8fb67`. Database rollback requires an
  isolated restore followed by a deliberate configuration switch.

### Verified upgrade: 2026-11-21 (chart 0.1.29 / application 0.2.24)

- Pre-upgrade backup directory: `/home/aaron/sub2api-preupgrade-20261121T013224Z`
  (outside the repository; directory mode `700`; both files mode `600`). It
  contains exactly `sub2api-postgresql.dump` (86,944,371 bytes, SHA-256
  `13526ed347d29bea63a63d90e9d13fd378aa6f8b0692a563e519995362b54fd5`) and
  `sub2api-app-data.tar.gz` (5,032,630 bytes, SHA-256
  `2ed5251a7fb40e80ab4990ae52b91b1e2d4e4426c8c2c7fdcf0989cbb12d04ed`).
  `pg_restore --list` passed inside the PostgreSQL container; the application
  data archive listing passed with 10 entries.
- Mirror PR #20 merged. The chart package SHA-256 was
  `b69628bb7050dc8f435a9228458ca17e88b44b4ee1a949aa342a9a1aedb3d413`; an
  anonymous OCI pull and package checksum matched. Mirror CI, Sub2API chart CI,
  publish workflow run `44849477770`, and Pages workflow run `44849477077`
  succeeded. GitOps commit `423a4c4a5b2ec115b7934c9e3645956b778dd9ec` changed
  only `targetRevision` from `0.1.28` to `0.1.29`.
- ArgoCD was `Synced/Healthy`, operation `Succeeded`. Deployment was 1/1; Pod
  `sub2api-75dd49bfc7-ftk89` was Ready with 0 restarts, and its runtime image ID
  matched Linux amd64 image
  `ghcr.io/wei-shaw/sub2api@sha256:329e1fb6b17e84bd8d28c7d1da61fc678a3b68c6a2f99180d65541fd774fc652`.
  The ready Service endpoint was `10.42.0.240:8080`; internal and public
  `/health` returned HTTP 200 with `{"status":"ok"}`. Dedicated Redis and
  shared PostgreSQL were 1/1 Ready with ready endpoints. The Sub2API data
  (10Gi), Redis (8Gi), and PostgreSQL (8Gi) PVCs were Bound. No specific
  migration is asserted.
- Release rollback is a new Git revert of
  `423a4c4a5b2ec115b7934c9e3645956b778dd9ec`. Because migrations are
  forward-only, database recovery requires restoring to an isolated database
  and making a deliberate configuration switch; this is not a database
  downgrade.

### Verified upgrade: 2026-11-24 (chart 0.1.30 / application 0.2.25)

- Fresh scoped pre-upgrade backup directory:
  `/home/aaron/Ops/backups/sub2api/upgrade-20261124T130444Z` (outside the
  repository; directory mode `700`, exactly two files, both mode `600`). The
  `sub2api.dump` was 91,160,962 bytes (SHA-256
  `b60c74bc522fa113ef9020c7bfb66f141eea2c08ae884e31e097621f8f05da16`);
  `sub2api-data.tgz` was 5,059,678 bytes (SHA-256
  `2c1b3936cad67c67635a4f2aa574a526389ec734c7dde91682c113f62b877828`).
  `pg_restore --list` passed with 1,259 entries using an in-container
  temporary-copy fallback; the temporary copy was removed. The `/app/data`
  archive listing returned 10 entries.
- Official Sub2API `v0.2.25` image is
  `ghcr.io/wei-shaw/sub2api@sha256:a532a5f09005081338bd2d503a6f463aef941f3c382dbc8637163c7230c42146`
  (Linux amd64). Mirror PR #21 merged as
  `7dd06ee87f04159812693f2cb50e4441224135b7`; candidate chart CI run
  `45395651473` and Mirror consistency CI run `45395651445` passed at head
  `0433ddad5e515abbee80559eaab592a4ce280f38`. Publish Sub2API chart run
  `45395933800` and Pages run `45395928993` succeeded. An anonymous Helm pull
  returned OCI manifest digest
  `sha256:7179980e0cad76cf76f8d56f6160f5d1fa6b5239eff29bdf42a3b1c96a83ec43`;
  package SHA-256 `7ba8e62a7c1f8b9630662ecae1add51a9f653f83f69faba3b62491c905ec54f4`
  matched the main index and package. Catalog and index list chart `0.1.30` /
  app `0.2.25`.
- GitOps commit `015df28d461ba3758e907b5ec6ebf85641895859` changed only
  `manifests/sub2api-argocd.yaml`, from `targetRevision` `0.1.29` to `0.1.30`.
  ArgoCD reported `Synced/Healthy`, operation `Succeeded`; Deployment was 1/1.
  Pod `sub2api-6b96465975-wsm8z` was Running/Ready with 0 restarts and its
  image spec and image ID matched the expected Linux amd64 digest. The ready
  Service endpoint was `10.42.0.249`; internal and public `/health` returned
  HTTP 200 with `{"status":"ok"}`. Dedicated Redis and shared PostgreSQL were
  Ready; Sub2API data (10Gi), Redis (8Gi), and PostgreSQL (8Gi) PVCs were Bound.
  No specific migration is asserted.
- Deployment rollback is a new Git revert of
  `015df28d461ba3758e907b5ec6ebf85641895859`. Migrations are forward-only, so
  database recovery requires an isolated restore followed by a deliberate
  configuration switch.

### Verified upgrade: 2026-11-28 (chart 0.1.31 / application 0.2.26)

- Fresh scoped pre-upgrade backup directory:
  `/home/aaron/Ops/backups/sub2api/upgrade-20261128T095940Z` (outside the
  repository; directory mode `700`, exactly two files, both mode `600`). The
  `sub2api.dump` was 94,106,259 bytes (SHA-256
  `164f75352938c7fe04f4be60dc179c4aedc63c9f93506bd82f50ba8d5422405f`);
  `sub2api-data.tgz` was 5,077,369 bytes (SHA-256
  `01f6723c81a788c21231ed62dea792211d1adecd79d2c0f588ae47cbda5e0445`).
  `pg_restore --list` passed with 1,259 entries using the in-container
  temporary-copy fallback; the temporary copy was removed. The archive listing
  returned 10 entries.
- Official Sub2API `v0.2.26` Linux amd64 image:
  `ghcr.io/wei-shaw/sub2api@sha256:4499efd416ae3b6345c71fbd85886473395baa2c6396cbd8af8705b6bb476a26`.
  Mirror PR #22 merged as `f8ab0b2388b449c6b9bad29b5a8cbdd131c83061`;
  candidate head `74077577dd3e056e10d6d8108bb63b7cdb75f77d` passed Sub2API chart
  CI run `46132508595` and Mirror consistency CI run `46132508696`. Publish
  workflow run `46132590294` and Pages workflow run `46132589995` succeeded.
  Anonymous OCI chart pull returned manifest digest
  `sha256:611dd601f77318f06d1f54af70ccbeddabd0f4b1e4874498c2677c791ec21fbd`;
  package SHA-256
  `341628d2e744b71f0e0461161da481e8887b4b8b648649f7ef4aedf7d49b5361` matched
  the main index and package. Index and catalog list chart `0.1.31` / app
  `0.2.26`.
- GitOps commit `360efa3b7725606c09f93db6751201d3691e7b17` changed only
  `targetRevision` from `0.1.30` to `0.1.31`. At `2026-11-28 10:10:25 UTC`,
  ArgoCD was `Synced/Healthy`, operation `Succeeded`; Deployment was 1/1. Pod
  `sub2api-56b956cfcf-w5zng` was Running/Ready with 0 restarts, and image spec
  and runtime image ID matched the expected digest on Linux/amd64. Ready
  Service endpoint was `10.42.0.50:8080`; internal and public `/health`
  returned HTTP 200 with `{"status":"ok"}`. Dedicated Redis was 1/1 ready
  with 2 historical restarts; shared PostgreSQL was 1/1 ready with 1 historical
  restart. Sub2API data (10Gi), Redis (8Gi), and PostgreSQL (8Gi) PVCs were
  Bound. No specific migration is asserted.
- Deployment rollback is a new Git revert of
  `360efa3b7725606c09f93db6751201d3691e7b17`. Migrations are forward-only, so
  database recovery requires restoring into an isolated database followed by a
  deliberate configuration switch.

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
