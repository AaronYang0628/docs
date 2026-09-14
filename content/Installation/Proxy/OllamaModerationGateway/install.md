+++
title = "Install (ArgoCD)"
description = "Deploy Ollama Moderation Gateway via 72602 GitOps ArgoCD"
+++

### 🚀Installation

{{< tabs groupid="environment" style="primary" title="Environment" icon="server" >}}

{{< tab title="72602" >}}
  {{< tabs groupid="install-method-72602" title="Install By" icon="thumbtack" >}}

  {{% tab title="🐙ArgoCD" %}}
  {{% include "/Installation/SNIPPET/_argo_cd_preliminary.md" %}}

  <p> <b>1.verify source and create namespace</b> </p>

  {{% notice style="transparent" %}}
  ```bash
  git -C /home/aaron/Ops/docs fetch origin main
  git -C /home/aaron/Ops/docs \
    show origin/main:manifests/ollama-moderation-gateway-argocd.yaml >/dev/null

  argocd app get ops-docs --hard-refresh
  argocd app sync ops-docs --revision main
  argocd app wait ops-docs --sync --timeout 300

  kubectl wait --for=jsonpath='{.status.phase}'=Active \
    namespace/moderation --timeout=120s
  ```
  {{% /notice %}}

  The parent `ops-docs` Application reads the `manifests` path and creates the
  child Application. The child creates namespace `moderation` through
  `CreateNamespace=true`.

  <p> <b>2.prepare runtime secret</b> </p>

  {{% notice style="transparent" %}}
  ```bash
  test -s /home/aaron/Ops/docs/.moderation.env
  test "$(stat -c %a /home/aaron/Ops/docs/.moderation.env)" = 600

  kubectl -n moderation create secret generic ollama-moderation-gateway \
    --from-env-file=/home/aaron/Ops/docs/.moderation.env \
    --dry-run=client -o yaml | kubectl apply -f -

  kubectl -n moderation get secret ollama-moderation-gateway --output=name
  ```
  {{% /notice %}}

  The ignored `.moderation.env` file must contain `OLLAMA_API_KEYS` and
  `MODERATION_API_KEYS`. Secret values remain outside Git and terminal output.

  <p> <b>3.verify GitOps source and sync child</b> </p>

  {{% notice style="transparent" %}}
  ```bash
  # confirm parent application source
  kubectl -n argocd get application ops-docs \
    -o jsonpath='{.spec.source.repoURL}{"\n"}{.spec.source.path}'

  # refresh and sync the child (ollama-moderation-gateway)
  argocd app get ollama-moderation-gateway --hard-refresh
  argocd app sync ollama-moderation-gateway
  argocd app wait ollama-moderation-gateway --sync --health --timeout 600
  ```
  {{% /notice %}}

  <p> <b>4.verify deployment, service, ingress and certificate</b> </p>

  {{% notice style="transparent" %}}
  ```bash
  # chart source details
  kubectl -n argocd get application ollama-moderation-gateway \
    -o jsonpath='{.spec.source.repoURL}{"\n"}{.spec.source.path}{"\n"}{.spec.source.targetRevision}{"\n"}'

  # image and release verification
  kubectl -n moderation get deployment ollama-moderation-gateway \
    -o jsonpath='{range .spec.template.spec.containers[*]}{.name}{"="}{.image}{"\n"}{end}'

  # rollout status
  kubectl -n moderation rollout status deployment/ollama-moderation-gateway --timeout=600s
  kubectl -n moderation get pods,svc,ingress
  kubectl -n moderation get certificate,certificaterequest,order,challenge
  kubectl -n moderation get endpointslice -l kubernetes.io/service-name=ollama-moderation-gateway

  # health checks
  curl -fsS https://moderation.llm.72602.space/health
  curl -fsS https://moderation.llm.72602.space/readyz

  # authenticated moderation request; do not echo the key or response body
  set +x
  read -rsp 'Gateway API key: ' GATEWAY_KEY; printf '\n'
  curl -fsS -X POST https://moderation.llm.72602.space/v1/moderations \
    -H "Authorization: Bearer ${GATEWAY_KEY}" \
    -H "Content-Type: application/json" \
    --json '{"model":"moderation-fast","input":"hello"}' \
    | jq -e '.results | length == 1' >/dev/null
  unset GATEWAY_KEY
  ```
  {{% /notice %}}

{{% notice style="transparent" %}}
**Current Operational State**: Deployment `ollama-moderation-gateway` desired replicas: **3**, available replicas: **3**. Service reports **three Ready endpoints**. Single-node resource metrics are healthy. The image, runtime configuration and Ingress remain unchanged; only `replicaCount` was changed.
{{% /notice %}}

  Expected release values: chart `ollama-moderation-gateway` version `0.1.0` and image
  `ghcr.io/aaronyang0628/ollama-moderation-gateway@sha256:6957f8a32ad93577500c6952d7dd0b9ae970672b82570144852c5fe5766773c5`. The TLS certificate `moderation.llm.72602.space-tls` should be `Ready` with expiry `2026-12-13T00:55:24Z`.

  {{% /tab %}}

  {{< /tabs >}}
{{< /tab >}}

{{< /tabs >}}

### 📦Rollback Guidance

If a deployment must be reverted, create a reviewed Git revert for the deployment source commit, push it, and sync the parent application. Runtime secrets and TLS certificates are external resources and are **not** modified by the rollback.

```bash
# create a reviewed revert in the docs repository
cd /home/aaron/Ops/docs
git fetch origin main
git revert --no-edit 39c48b3
git push origin main
argocd app sync ops-docs --revision main
argocd app wait ops-docs --sync --health --timeout 300
```

After rollback, re-run the verification steps above to ensure the service is healthy.
