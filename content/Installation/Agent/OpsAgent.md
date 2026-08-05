+++
title = 'Ops Agent'
date = 2024-03-07T15:00:59+08:00
weight = 151
+++

### 🚀Installation

{{< tabs groupid="environment" style="primary" title="Environment" icon="server" >}}

{{< tab title="72602" >}}
  {{< tabs groupid="install-method-72602" title="Install By" icon="thumbtack" >}}

  {{% tab title="🐙ArgoCD" %}}
  {{% include "/Installation/SNIPPET/_argo_cd_preliminary.md" %}}

  <p> <b>1.build and push</b> Ops Agent image </p>

  {{% notice style="transparent" %}}
  ```bash
  cd /home/aaron/Ops/docs
  ./manifests/ops-agent/build-and-push.sh
  ```
  {{% /notice %}}

  The image contains OpenCode, kubectl, Argo CD CLI, Git, SSH, `opencode-vibeguard`, DCP, and Goal Mode. The repository is not baked into the image; the Pod mounts `/home/aaron/Ops/docs` at `/workspace`.
  <p> <b>2.prepare</b> runtime Secrets </p>

  {{% notice style="transparent" %}}
  ```bash
  export OPENAI_API_KEY='<rotated-api-key>'
  export GROK_API_KEY='<rotated-grok-api-key>'
  export OLLAMA_API_KEY='<rotated-ollama-api-key>'
  ./manifests/ops-agent/create-secrets.sh
  unset OPENAI_API_KEY GROK_API_KEY OLLAMA_API_KEY

  ./manifests/ops-agent/create-sub2api-mcp-secret.sh
  ```
  {{% /notice %}}

  The base script requires all three model credentials so a later run cannot
  remove an existing provider key. It creates or updates model, SSH, Git
  credential, Registry, and Basic Auth Secrets without writing their values
  into Git. The Sub2API helper accepts the admin API key only through its
  silent interactive prompt, validates its `admin-<hex64>` shape, writes
  only `application/sub2api-mcp` key `admin-api-key`, and unsets the local
  variable before exit. The script refuses any other format.

  <p> <b>3.sync by ArgoCD</b> </p>

  {{% notice style="transparent" %}}
  ```bash
  argocd app get ops-docs --hard-refresh
  argocd app sync ops-docs --revision main
  argocd app wait ops-docs --sync --health --timeout 300

  argocd app get ops-agent --hard-refresh
  argocd app sync ops-agent
  argocd app wait ops-agent --sync --health --timeout 600
  kubectl -n application rollout status deployment/ops-agent --timeout=600s
  ```
  {{% /notice %}}

  `argocd/ops-docs` owns `manifests/ops-agent-argocd.yaml`; the child
  `argocd/ops-agent` Application deploys `manifests/ops-agent` into namespace
  `application`. Do not apply the Kustomization directly as a second ownership
  path. The Deployment mounts the host workspace read-write and stores OpenCode
  session data in the `opencode-data` PVC.

  Startup configuration is loaded only when OpenCode starts. After changing
  `.opencode/opencode.json`, agents, skills, or plugins, restart only the managed
  workload and wait for readiness:

  {{% notice style="transparent" %}}
  ```bash
  kubectl -n application rollout restart deployment/ops-agent
  kubectl -n application rollout status deployment/ops-agent --timeout=300s
  ```
  {{% /notice %}}

  The live strategy is `Recreate`, so a restart briefly makes the web endpoint
  unavailable while the replacement Pod becomes Ready.

  <p> <b>4.verify</b> configuration and access </p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl -n application get pod,svc,ingress \
    -l app.kubernetes.io/name=ops-agent
  kubectl -n application get certificate ops.agent.72602.space-tls

  kubectl -n application exec deployment/ops-agent -c ops-agent -- \
    opencode debug agent hugo-doc-maintainer

  kubectl -n application exec deployment/ops-agent -c ops-agent -- sh -c \
    'curl -fsS -u "$OPENCODE_SERVER_USERNAME:$OPENCODE_SERVER_PASSWORD" \
    http://127.0.0.1:4000/global/health'

  kubectl -n application exec deployment/ops-agent -c ops-agent -- sh -c \
    'curl -fsS -u "$OPENCODE_SERVER_USERNAME:$OPENCODE_SERVER_PASSWORD" \
    http://127.0.0.1:4000/mcp | jq -e ". == {\"sub2api-admin\": {\"status\": \"connected\"}}"'

  kubectl -n application exec deployment/ops-agent -c ops-agent -- sh -c \
    'CFG=$(curl -fsS -u "$OPENCODE_SERVER_USERNAME:$OPENCODE_SERVER_PASSWORD" \
    http://127.0.0.1:4000/config); echo "$CFG" | \
    jq -e ".mcp[\"sub2api-admin\"].environment[\"SUB2API_BASE_URL\"] == \
    \"http://sub2api.application.svc.cluster.local:8080\"" && \
    ! echo "$CFG" | grep -Eq "SUB2API_ADMIN_API_KEY|admin-api-key|x-api-key"'

  kubectl -n application exec deployment/ops-agent -c ops-agent -- \
    opencode mcp list

  kubectl -n application exec deployment/ops-agent -c ops-agent -- sh -c \
    'curl -fsS -u "$OPENCODE_SERVER_USERNAME:$OPENCODE_SERVER_PASSWORD" \
    http://127.0.0.1:4000/provider | \
    jq "{connected,ollama:(.all[]|select(.id==\"ollama\")|.models|keys)}"'

  PASSWORD="$(kubectl -n application get secret opencode-basic-auth \
    -o jsonpath='{.data.password}' | base64 -d)"

  curl -sS -o /dev/null -w '%{http_code}\n' \
    -u "aaron:$PASSWORD" https://ops.agent.72602.space/
  ```
  {{% /notice %}}

  Expected result: the Pod is Ready, the certificate is `True`, anonymous
  access returns `401`, authenticated access returns `200`, `global/health`
  reports `healthy: true`, `/mcp` returns exactly
  `{"sub2api-admin":{"status":"connected"}}`, the merged OpenCode config
  carries `SUB2API_BASE_URL=http://sub2api.application.svc.cluster.local:8080`
  without the admin key, `opencode mcp list` reports `sub2api-admin`
  connected, and the connected Ollama provider lists `gemma4:31b`,
  `minimax-m3`, and `gpt-oss:120b`. The live authenticated version read
  through `72602-k3s-maintainer` using `sub2api-admin_read` against
  `/api/v1/admin/system/version` returns `0.1.168`.
  {{% /tab %}}

  {{< /tabs >}}
{{< /tab >}}

{{< /tabs >}}

### 🤖Agents

| Agent | Responsibility | Operational source |
|---|---|---|
| `72602-k3s-maintainer` | Operate the local 72602 cluster | Live cluster, then `content/CSP/72602/_index.md` |
| `zjlab-ops-maintainer` | Operate ZJLAB through private SSH aliases | Live cluster, then the private inventory |
| `hugo-doc-maintainer` | Maintain Relearn layout and runbooks | Relearn and Installation skills |

All three are subagents and inherit the model selected by the active conversation. Cluster agents verify live state before following a runbook and delegate verified documentation updates to the Hugo agent.

Aliyun operations for `72602-k3s-maintainer` are documented by the public `.opencode/skills/aliyun-72602-operations/SKILL.md`, introduced in commit `96a9354`.

### 🧰MCP & Skills

#### Local Sub2API admin MCP

The OpenCode config registers a single local MCP server `sub2api-admin`
under `mcp.sub2api-admin`:

```json
{
  "type": "local",
  "command": ["node", ".opencode/mcp/sub2api-admin/server.mjs"],
  "cwd": "/workspace",
  "environment": {
    "SUB2API_BASE_URL": "http://sub2api.application.svc.cluster.local:8080",
    "SUB2API_ALLOWED_HOST": "sub2api.application.svc.cluster.local",
    "SUB2API_TIMEOUT_MS": "30000",
    "SUB2API_MAX_RECHARGE": "10000"
  },
  "enabled": true,
  "timeout": 40000
}
```

The server reads its credential from the environment variable
`SUB2API_ADMIN_API_KEY`. The Deployment injects that variable from the
dedicated runtime Secret `application/sub2api-mcp` key `admin-api-key`:

```yaml
- name: SUB2API_ADMIN_API_KEY
  valueFrom:
    secretKeyRef:
      name: sub2api-mcp
      key: admin-api-key
```

The key is provisioned interactively by
`manifests/ops-agent/create-sub2api-mcp-secret.sh`, which accepts the value
from the operator, validates its `admin-<hex64>` shape, writes the Secret,
and unsets the local variable. The script refuses any other format. The
value never enters Git or `opencode.json`.

The server only accepts the configured cluster-local host; every
authenticated GET runs through a reviewed route allowlist, sensitive fields
are recursively redacted, and the MCP exposes only dedicated mutation tools.

#### Tool surface

The MCP registers nine tools:

- `describe`: capabilities and safety constraints.
- `health`: anonymous check of `/health` through the configured internal
  cluster-local URL (`SUB2API_BASE_URL`), not the public `token.72602.space`
  endpoint.
- `read`: one allowlisted authenticated GET route.
- `find_user`: resolve exactly one user by normalized email.
- `preview_recharge`: non-mutating preview of an additive credit.
- `recharge`: additive credit with backend idempotency.
- `update_user_limits`: per-user RPM and/or concurrency.
- `set_account_schedulable`: enable or disable scheduling for an entire
  upstream account.
- `model_control_options`: explain the available scheduling boundaries
  and rate-limit scopes.

There is no generic authenticated write tool.

#### Sub2API 72602 operations skill

The skill `.opencode/skills/sub2api-72602-operations/SKILL.md` is loaded by
`72602-k3s-maintainer` whenever the task touches live Sub2API state. It
records the boundaries, the recharge workflow, the limits and model
availability constraints, and the verification loop. Recharge is additive
USD-style internal credit only. The MCP accepts one exact normalized email
and an immutable user id; every call must pass one stable
`Idempotency-Key` (16-128 URL-safe characters) and re-read the user plus
balance history. The MCP reports an exact `verified` or
`accepted_unverified` outcome; the skill forbids rewriting an
`accepted_unverified` response as success.

Limits and model availability are constrained in Sub2API v0.1.168:

- User RPM and concurrency can be set through
  `sub2api-admin_update_user_limits`.
- Group RPM exists through the admin UI; this MCP does not expose it.
- Sub2API v0.1.168 has no configurable per-model RPM.
- Temporary model unavailability uses the actual scheduling boundary:
  dedicated accounts (`set_account_schedulable`), restricted channel model
  lists, or composite routes. `models_list_config` only hides discovery and
  must never be reported as a disable. Changes affect new requests only.

The skill is documentation; the runtime stays scoped to the maintainer. No
account is recharged as part of installation.

#### Permission scope

The global OpenCode permission set denies every `sub2api-admin_*` tool.
The maintainer agent permits the read-only tools directly and asks before
calling `sub2api-admin_recharge`, `sub2api-admin_update_user_limits`, and
`sub2api-admin_set_account_schedulable`:

```yaml
permission:
  "sub2api-admin_describe": allow
  "sub2api-admin_health": allow
  "sub2api-admin_read": allow
  "sub2api-admin_find_user": allow
  "sub2api-admin_preview_recharge": allow
  "sub2api-admin_model_control_options": allow
  "sub2api-admin_recharge": ask
  "sub2api-admin_update_user_limits": ask
  "sub2api-admin_set_account_schedulable": ask
```

Other agents inherit the global deny and must request the maintainer for
any `sub2api-admin_*` mutation. The MCP does not expose credential
rotation, OAuth exchange, backup restore, or application lifecycle
operations.

#### Secret rotation

Sub2API supports only one Admin API Key. Generating or regenerating the
key in the admin UI immediately invalidates the previous key, so the MCP
will briefly fail to authenticate until the Ops Agent workload restarts
with the new value. Plan an expected maintenance window of one to two
restart cycles. Rotate in this exact order without intermediate pauses:

1. Generate the new key in the Sub2API admin UI and immediately enter it
   into the silent prompt of
   `manifests/ops-agent/create-sub2api-mcp-secret.sh`; the helper runs
   once, validates the format, writes `application/sub2api-mcp` key
   `admin-api-key`, and exits without echoing the value.
2. Restart the managed workload so the new env var is injected:
   ```bash
   kubectl -n application rollout restart deployment/ops-agent
   kubectl -n application rollout status deployment/ops-agent --timeout=300s
   ```
3. Verify `global/health` reports `healthy: true`, `/mcp` reports exactly
   `{"sub2api-admin":{"status":"connected"}}`, and the merged OpenCode
   config carries the cluster-local `SUB2API_BASE_URL` without the admin
   key.
4. Through `72602-k3s-maintainer`, run `sub2api-admin_read` against
   `/api/v1/admin/system/version`; the live application must respond
   `0.1.168`.

Enter the key only into the helper's silent prompt. Never place it in
shell arguments, chat, Git, OpenCode config, logs, or command output.
Regenerating the key upstream is itself the invalidation step; no
follow-up "disable previous key" call is needed or supported.

Test the MCP server with `node --test .opencode/mcp/sub2api-admin/server.test.mjs`;
three tests pass and exercise the allowlist, path-traversal rejection, and
recharge idempotency.

### 🔌Plugins

- `opencode-vibeguard@0.1.0`: redacts configured credential patterns before model requests.
- `@tarquinen/opencode-dcp@3.1.14`: prunes stale context while protecting agent, skill, and cluster-profile files.
- `@prevalentware/opencode-goal-plugin@0.1.24`: persists long-running goals and evidence-gated completion state.

Langfuse is not installed or enabled.

### ↩️Rollback

Restore the previous reviewed configuration and Deployment through Git, then
let the parent and child Applications converge:

```bash
git -C /home/aaron/Ops/docs log --oneline -- \
  .opencode/opencode.json manifests/ops-agent
git -C /home/aaron/Ops/docs revert <change-commit>
git -C /home/aaron/Ops/docs push origin HEAD:main

argocd app get ops-agent --hard-refresh
argocd app sync ops-agent
argocd app wait ops-agent --sync --health --timeout 600
kubectl -n application rollout restart deployment/ops-agent
kubectl -n application rollout status deployment/ops-agent --timeout=300s
```

Do not patch the Deployment, delete the Ingress/PVC/Secrets, or scale the
Git-owned workload as a rollback path.
