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
  ```
  {{% /notice %}}

  The script requires all three model credentials so a later run cannot remove
  an existing provider key. It creates or updates model, SSH, Git credential,
  Registry, and Basic Auth Secrets without writing their values into Git.

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
    http://127.0.0.1:4000/provider | \
    jq "{connected,ollama:(.all[]|select(.id==\"ollama\")|.models|keys)}"'

  PASSWORD="$(kubectl -n application get secret opencode-basic-auth \
    -o jsonpath='{.data.password}' | base64 -d)"

  curl -sS -o /dev/null -w '%{http_code}\n' \
    -u "aaron:$PASSWORD" https://ops.agent.72602.space/
  ```
  {{% /notice %}}

  Expected result: the Pod is Ready, the certificate is `True`, anonymous
  access returns `401`, authenticated access returns `200`, and the connected
  Ollama provider lists `gemma4:31b`, `minimax-m3`, and `gpt-oss:120b`.
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
