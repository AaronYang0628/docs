+++
title = "Install (ArgoCD)"
description = "Deploy Sub2API through the 72602 GitOps parent and OCI Helm child Application"
+++

### 🚀Installation

{{< tabs groupid="environment" style="primary" title="Environment" icon="server" >}}

{{< tab title="72602" >}}
  {{< tabs groupid="install-method-72602" title="Install By" icon="thumbtack" >}}

  {{% tab title="🐙ArgoCD" %}}
  {{% include "/Installation/SNIPPET/_argo_cd_preliminary.md" %}}

  4. PostgreSQL is available in namespace `database`, DNS resolves
  `token.72602.space`, and ingress-nginx with the `lets-encrypt` ClusterIssuer
  is ready.

  <p> <b>1.prepare</b> runtime Secrets </p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl get namespace application >/dev/null 2>&1 || \
    kubectl create namespace application

  set +x
  read -rsp 'Sub2API admin password: ' ADMIN_PASSWORD; printf '\n'
  read -rsp 'Sub2API PostgreSQL password: ' POSTGRES_PASSWORD; printf '\n'
  read -rsp 'Sub2API Redis password: ' REDIS_PASSWORD; printf '\n'
  JWT_SECRET="$(openssl rand -hex 32)"
  TOTP_KEY="$(openssl rand -hex 32)"

  test -n "$ADMIN_PASSWORD"
  test -n "$POSTGRES_PASSWORD"
  test -n "$REDIS_PASSWORD"

  kubectl -n application create secret generic sub2api-auth \
    --from-literal=admin-password="$ADMIN_PASSWORD" \
    --from-literal=jwt-secret="$JWT_SECRET" \
    --from-literal=totp-encryption-key="$TOTP_KEY" \
    --dry-run=client -o yaml | kubectl apply -f -

  kubectl -n application create secret generic sub2api-external-postgresql \
    --from-literal=postgres-password="$POSTGRES_PASSWORD" \
    --dry-run=client -o yaml | kubectl apply -f -

  kubectl -n application create secret generic sub2api-redis \
    --from-literal=redis-password="$REDIS_PASSWORD" \
    --dry-run=client -o yaml | kubectl apply -f -

  unset ADMIN_PASSWORD POSTGRES_PASSWORD REDIS_PASSWORD JWT_SECRET TOTP_KEY
  kubectl -n application get secret \
    sub2api-auth sub2api-external-postgresql sub2api-redis
  ```
  {{% /notice %}}

  Secret values must stay outside Git, terminal output, and this handbook.

  <p> <b>2.verify</b> the GitOps source </p>

  The parent `argocd/ops-docs` Application reads
  `https://github.com/AaronYang0628/docs.git` at path `manifests`. The canonical
  child declaration is `manifests/sub2api-argocd.yaml`; it configures the OCI
  chart source and must not be applied as an independent deployment route.

  {{% notice style="transparent" %}}
  ```bash
  git -C /home/aaron/Ops/docs fetch origin main
  git -C /home/aaron/Ops/docs \
    show origin/main:manifests/sub2api-argocd.yaml >/dev/null

  kubectl -n argocd get application ops-docs \
    -o jsonpath='{.spec.source.repoURL}{"\n"}{.spec.source.path}{"\n"}'
  ```
  {{% /notice %}}

  Expected source values are `https://github.com/AaronYang0628/docs.git` and
  `manifests`.

  <p> <b>3.sync</b> parent and child Applications </p>

  {{% notice style="transparent" %}}
  ```bash
  argocd app get ops-docs --hard-refresh
  argocd app sync ops-docs --revision main
  argocd app wait ops-docs --sync --health --timeout 300

  argocd app get sub2api --hard-refresh
  argocd app sync sub2api
  argocd app wait sub2api --sync --health --timeout 600
  ```
  {{% /notice %}}

  <p> <b>4.verify</b> release, storage, ingress, and API path </p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl -n argocd get application sub2api \
    -o jsonpath='{.spec.source.repoURL}{"\n"}{.spec.source.chart}{" "}{.spec.source.targetRevision}{"\n"}'

  kubectl -n application get deployment sub2api \
    -o jsonpath='{range .spec.template.spec.containers[*]}{.name}{"="}{.image}{"\n"}{end}'

  kubectl -n application rollout status deployment/sub2api --timeout=600s
  kubectl -n application get pods,svc,ingress,pvc
  kubectl -n application get certificate,certificaterequest,order,challenge
  kubectl -n application get endpointslice \
    -l kubernetes.io/service-name=sub2api

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
  {{% /notice %}}

  Expected release values are chart `0.1.8` and application image
  `ghcr.io/wei-shaw/sub2api:0.1.176`. The TLS certificate is `Ready`; the
  `sub2api-data` PVC is `10Gi` and the Redis PVC is `8Gi`, both `local-path`
  `RWO`.
  {{% /tab %}}

  {{< /tabs >}}
{{< /tab >}}

{{< /tabs >}}
