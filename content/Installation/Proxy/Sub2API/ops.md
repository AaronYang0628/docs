+++
title = "Ops"
description = "GitOps upgrades and daily operations for Sub2API"
+++

### Web Page
[<i class="fa-solid fa-link"></i> sub2api web page (https://token.72602.space)](https://token.72602.space)

### Current Release

```bash
argocd app get ops-docs --hard-refresh
argocd app get sub2api --hard-refresh

kubectl -n argocd get application sub2api \
  -o jsonpath='{.spec.source.repoURL}{"\nchart="}{.spec.source.chart}{" "}{.spec.source.targetRevision}{"\nimage.tag="}{.spec.source.helm.parameters[?(@.name=="image.tag")].value}{"\n"}'

kubectl -n application get deployment sub2api \
  -o jsonpath='{range .spec.template.spec.containers[*]}{.name}{"="}{.image}{"\n"}{end}'

kubectl -n application get pods,svc,ingress,pvc
kubectl -n application get certificate,certificaterequest,order,challenge
```

The expected values are OCI chart `0.1.8`, image
`ghcr.io/wei-shaw/sub2api:0.1.176`, namespace `application`, and host
`token.72602.space`. The application PVC is `10Gi`; the Redis PVC is `8Gi`
with AOF enabled. Both use `local-path` and `RWO`.

### Sync From Git

`argocd/ops-docs` owns `manifests/sub2api-argocd.yaml` from
`https://github.com/AaronYang0628/docs.git`. Reconcile the Git parent before the
OCI Helm child:

```bash
git -C /home/aaron/Ops/docs fetch origin main
argocd app get ops-docs --hard-refresh
argocd app sync ops-docs --revision main
argocd app wait ops-docs --sync --health --timeout 300

argocd app get sub2api --hard-refresh
argocd app sync sub2api
argocd app wait sub2api --sync --health --timeout 600
```

Do not apply `manifests/sub2api-argocd.yaml` directly as a second ownership
path.

### Rolling Upgrade

<p> <b>1.back up</b> PostgreSQL before changing chart or image values </p>

Use the [Backup & Restore](../backup/) runbook. Sub2API executes PostgreSQL
migrations automatically at startup, and migrations are forward-only. Verify
the dump before continuing.

<p> <b>2.update</b> the Git source </p>

Edit only the reviewed `targetRevision`, `image.tag`, or required values in
`manifests/sub2api-argocd.yaml`, then inspect and publish the change:

```bash
git -C /home/aaron/Ops/docs diff --check -- manifests/sub2api-argocd.yaml
git -C /home/aaron/Ops/docs diff -- manifests/sub2api-argocd.yaml
git -C /home/aaron/Ops/docs add manifests/sub2api-argocd.yaml
git -C /home/aaron/Ops/docs commit -m "chore: upgrade sub2api"
git -C /home/aaron/Ops/docs push origin HEAD:main
```

<p> <b>3.reconcile</b> parent and child Applications </p>

```bash
argocd app get ops-docs --hard-refresh
argocd app sync ops-docs --revision main
argocd app wait ops-docs --sync --health --timeout 300

argocd app get sub2api --hard-refresh
argocd app sync sub2api
argocd app wait sub2api --sync --health --timeout 600
kubectl -n application rollout status deployment/sub2api --timeout=600s
kubectl -n application get endpointslice \
  -l kubernetes.io/service-name=sub2api -o wide
```

The Deployment explicitly uses `maxUnavailable: 0` and `maxSurge: 1`.
Kubernetes adds the new Ready Pod to the EndpointSlice before terminating the
old Pod, and the Service selects only Ready endpoints. This protects new
requests during rollout, but it does not guarantee completion of requests that
are already attached to the terminating Pod. Long generations still require
the application to handle graceful termination and draining correctly.

<p> <b>4.verify</b> the public and authenticated model path </p>

```bash
curl -fsS https://token.72602.space/health
curl -fsS https://token.72602.space/api/v1/settings/public

set +x
read -rsp 'Sub2API API token: ' SUB2API_API_TOKEN; printf '\n'
curl -fsS \
  -H "Authorization: Bearer ${SUB2API_API_TOKEN}" \
  https://token.72602.space/v1/models

read -rp 'Model ID for smoke generation: ' MODEL_ID
curl -fsS https://token.72602.space/v1/chat/completions \
  -H "Authorization: Bearer ${SUB2API_API_TOKEN}" \
  --json "{\"model\":\"${MODEL_ID}\",\"messages\":[{\"role\":\"user\",\"content\":\"Reply with OK.\"}],\"max_tokens\":8}"
unset SUB2API_API_TOKEN MODEL_ID
```

### Admin MCP

The Ops Agent Pod runs a local MCP server `sub2api-admin` against the
cluster-local endpoint
`http://sub2api.application.svc.cluster.local:8080`. The Deployment
injects the API key from the dedicated runtime Secret
`application/sub2api-mcp` key `admin-api-key`. Provision the Secret
through `manifests/ops-agent/create-sub2api-mcp-secret.sh`; the value
never enters Git or `opencode.json`. The MCP only accepts the configured
cluster-local host, every authenticated GET runs through a reviewed route
allowlist, sensitive fields are recursively redacted, and no generic
authenticated write tool is exposed.

Enter the key only into the helper's silent interactive prompt. Never
place the key in shell arguments, chat, Git, OpenCode config, logs, or
command output.

#### Tools

Nine tools are registered:

| Tool | Purpose |
|---|---|
| `sub2api-admin_describe` | Capabilities and safety constraints |
| `sub2api-admin_health` | Anonymous check of `/health` through the configured internal cluster-local URL (`SUB2API_BASE_URL`), not the public host |
| `sub2api-admin_read` | One allowlisted authenticated GET route |
| `sub2api-admin_find_user` | Resolve exactly one user by normalized email |
| `sub2api-admin_preview_recharge` | Non-mutating preview of an additive credit |
| `sub2api-admin_recharge` | Additive credit with backend idempotency |
| `sub2api-admin_update_user_limits` | Per-user RPM and/or concurrency |
| `sub2api-admin_set_account_schedulable` | Enable or disable scheduling for an entire upstream account |
| `sub2api-admin_model_control_options` | Explain the available scheduling boundaries and rate-limit scopes |

The global OpenCode permission set denies every `sub2api-admin_*` tool.
The `72602-k3s-maintainer` agent allows the six read-only tools directly
and asks before `recharge`, `update_user_limits`, or
`set_account_schedulable`. Use the maintainer for any authenticated
mutation.

#### Recharge protocol

Recharge is additive USD-style internal credit only; `set` and `subtract`
operations are not exposed. Before every charge:

1. Collect an exact email and a positive amount.
2. Call `sub2api-admin_preview_recharge`. The server fuzzy-searches but
   accepts only one exact normalized email match.
3. Read back the matched email, the immutable user id, status, the current
   balance, the amount, and the expected balance; obtain explicit
   confirmation for that exact tuple.
4. Generate one stable `Idempotency-Key` of 16-128 URL-safe characters.
   Keep and reuse that key when the result is uncertain; never generate a
   fresh key for a retry.
5. Call `sub2api-admin_recharge` with `operation: add`, the exact email
   and id, the audit note, and the idempotency key.
6. Re-read the user and balance history; record the exact `verified` or
   `accepted_unverified` outcome. Never rewrite an unverified accepted
   response as success.

No account is recharged as part of installation. Do not recharge inactive
users unless the operator explicitly confirms the inactive status.

#### Limits and model availability

Sub2API v0.1.176 has no configurable per-model RPM. Operator scope:

- User RPM and concurrency via `sub2api-admin_update_user_limits`.
- Group RPM is set through the admin UI; this MCP does not expose it.
- `rate_multiplier` changes billing, not request rate.

For temporary model unavailability, call
`sub2api-admin_model_control_options` first and identify the model's
actual scheduling boundary:

- Dedicated account: `sub2api-admin_set_account_schedulable`
  toggles every model served by that account; roll back with the inverse
  value.
- Restricted channel: remove the exact model from the channel
  pricing/model list while `restrict_models=true`; preserve the previous
  payload for rollback. This MCP does not mutate channels, use the admin
  UI.
- Composite model: disable the exact composite route; preserve prior
  state. Use the admin UI.
- `models_list_config` only hides discovery. It does not block direct
  requests and must never be reported as a disable.

Scheduling changes affect new requests only. They do not cancel requests
or streams already in progress. If the model spans multiple accounts,
channels, or routes, enumerate and confirm every affected target before
mutation.

### Secret rotation

Sub2API supports only one Admin API Key. Generating or regenerating the
key in the admin UI immediately invalidates the previous key, so the MCP
will briefly fail to authenticate until the Ops Agent workload restarts
with the new value. Plan an expected maintenance window of one to two
restart cycles. Rotate in this exact order without intermediate pauses:

1. Generate the new key in the Sub2API admin UI and immediately enter it
   into the silent prompt of
   `manifests/ops-agent/create-sub2api-mcp-secret.sh`. Confirm the
   helper reports `application/sub2api-mcp keys=admin-api-key`.
2. Restart the managed workload so the new env var is injected:
   ```bash
   kubectl -n application rollout restart deployment/ops-agent
   kubectl -n application rollout status deployment/ops-agent --timeout=300s
   ```
3. Verify `global/health` reports `healthy: true`, `/mcp` reports exactly
   `{"sub2api-admin":{"status":"connected"}}`, and the merged OpenCode
   config carries the cluster-local `SUB2API_BASE_URL` without the new
   key.
4. Through `72602-k3s-maintainer`, run `sub2api-admin_read` against
   `/api/v1/admin/system/version`; the live application must respond
    `0.1.176`.

The upstream "generate key" action is itself the invalidation step; no
follow-up disable of the previous key is needed or supported.

Tests: `node --test .opencode/mcp/sub2api-admin/server.test.mjs` passes
three tests covering the allowlist, path-traversal rejection, and the
recharge idempotency path.

### GitOps Rollback

Restore the previous reviewed chart and image values, and any reviewed
OpenCode configuration, with `git revert` or a new commit, then let
ArgoCD converge:

```bash
git -C /home/aaron/Ops/docs log --oneline -- manifests/sub2api-argocd.yaml .opencode/opencode.json
git -C /home/aaron/Ops/docs revert <change-commit>
git -C /home/aaron/Ops/docs push origin HEAD:main

argocd app get ops-docs --hard-refresh
argocd app sync ops-docs --revision main
argocd app wait ops-docs --sync --health --timeout 300
argocd app sync sub2api
argocd app wait sub2api --sync --health --timeout 600

kubectl -n application rollout restart deployment/ops-agent
kubectl -n application rollout status deployment/ops-agent --timeout=300s
```

After the Ops Agent Pod rolls back and no Deployment references the
helper Secret, remove it:

```bash
test -z "$(kubectl -n application get deployment -o json \
  | jq -r '.items[].spec.template.spec.containers[]
          | select(.env[]?.valueFrom.secretKeyRef.name=="sub2api-mcp")
          | .name')" && \
  kubectl -n application delete secret sub2api-mcp
```

An image/chart rollback does not reverse a forward-only PostgreSQL migration.
Confirm compatibility with the migrated schema; when database recovery is
required, restore the pre-upgrade dump into a separate database and switch via
a reviewed Git change. Do not use `kubectl rollout undo`, and do not delete
PVCs or Secrets as a rollback step until the Git revert and ops-agent
restart are Healthy.

### Troubleshooting

```bash
kubectl -n application logs deployment/sub2api --since=10m
kubectl -n application get events --sort-by=.lastTimestamp
kubectl -n application get endpointslice \
  -l kubernetes.io/service-name=sub2api -o yaml
argocd app get sub2api --hard-refresh
```

### 🛎️FAQ

{{% expand title="Settings API reports column settings.id does not exist" %}}

If `/api/v1/settings/public` or the admin settings API returns HTTP `500` and
the logs contain `pq: column settings.id does not exist`, Sub2API is connected
to a shared or legacy database with an incompatible `settings` table.

Confirm that the live Application and Secret reference the dedicated
`sub2api` database and user without printing the password:

```bash
kubectl -n argocd get application sub2api \
  -o jsonpath='{.spec.source.helm.values}'
kubectl -n application get secret sub2api-external-postgresql
kubectl -n application logs deployment/sub2api --since=10m
```

Keep `externalPostgresql.username` and `externalPostgresql.database` set to
`sub2api` in `manifests/sub2api-argocd.yaml`. Create or recover the dedicated
database first, then update the Secret through the approved secret-management
process and reconcile through ArgoCD. Do not point Sub2API at the `n8n`
database or patch the Deployment directly.

{{% /expand %}}

{{% expand title="Redis reports WRONGPASS" %}}

`WRONGPASS invalid username-password pair` means the password used by the
Sub2API Pod no longer matches the Redis Secret. The chart must continue to pin
the stable Secret and key:

```yaml
redis:
  auth:
    existingSecret: sub2api-redis
    existingSecretPasswordKey: redis-password
```

Verify references and workload state without reading the Secret value:

```bash
kubectl -n application get secret sub2api-redis
kubectl -n application get deployment sub2api \
  -o jsonpath='{range .spec.template.spec.containers[0].env[*]}{.name}{" <- "}{.valueFrom.secretKeyRef.name}{"/"}{.valueFrom.secretKeyRef.key}{"\n"}{end}'
kubectl -n application logs deployment/sub2api --since=10m
```

If rotation is required, update Redis and `application/sub2api-redis` as one
planned operation, then reconcile the Git-owned Application. Do not generate a
new password during a routine restart.

{{% /expand %}}
