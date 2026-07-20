+++
title = 'Ops Agent'
date = 2024-03-07T15:00:59+08:00
weight = 151
+++

### 🚀Installation

{{< tabs groupid="environment" style="primary" title="Environment" icon="server" >}}

{{< tab title="72602" >}}
  {{< tabs groupid="install-method-72602" title="Install By" icon="thumbtack" >}}

  {{% tab title="☸️Kubernetes" %}}
  {{% include "/Installation/SNIPPET/_manifests_preliminary.md" %}}

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
  ./manifests/ops-agent/create-secrets.sh
  ```
  {{% /notice %}}

  The script creates or updates model, SSH, Git credential, Registry, and Basic Auth Secrets without writing their values into Git.

  <p> <b>3.apply</b> Ops Agent resources </p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl apply -k manifests/ops-agent
  kubectl -n application rollout status deployment/ops-agent --timeout=600s
  ```
  {{% /notice %}}

  The Deployment uses `application/ops-agent-sa`, mounts the host workspace read-write, and stores OpenCode session data in the `opencode-data` PVC.

  <p> <b>4.verify</b> configuration and access </p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl -n application get pod,svc,ingress,certificate \
    -l app.kubernetes.io/name=ops-agent

  kubectl -n application exec deployment/ops-agent -c ops-agent -- \
    opencode debug agent hugo-doc-maintainer

  PASSWORD="$(kubectl -n application get secret opencode-basic-auth \
    -o jsonpath='{.data.password}' | base64 -d)"

  curl -sS -o /dev/null -w '%{http_code}\n' \
    -u "aaron:$PASSWORD" https://ops.agent.72602.online/
  ```
  {{% /notice %}}

  Expected result: the Pod is Ready, the certificate is `True`, anonymous access returns `401`, and authenticated access returns `200`.
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

```bash
kubectl -n application delete ingress ops-agent
kubectl -n application scale deployment/ops-agent --replicas=0
```
