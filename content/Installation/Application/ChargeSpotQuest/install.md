+++
title = "Install (ArgoCD)"
description = "Deploy Charge Spot Quest via 72602 GitOps ArgoCD"
+++

### 🚀Installation

{{< tabs groupid="environment" style="primary" title="Environment" icon="server" >}}

{{< tab title="72602" >}}
  {{< tabs groupid="install-method-72602" title="Install By" icon="thumbtack" >}}

  {{% tab title="🐙ArgoCD" %}}
  {{% include "/Installation/SNIPPET/_argo_cd_preliminary.md" %}}

  <p> <b>1.prepare</b> `charge` DNS A record </p>

  {{% notice style="transparent" %}}
  ```bash
  # zone 72602.space, RR charge, type A, value 47.110.67.161, TTL 600
  # create only when the matching enabled record is absent
  ```
  {{% /notice %}}

  <p> <b>2.prepare</b> `charge-spot-quest-argocd.yaml` </p>

  {{% notice style="transparent" %}}
  ```bash
  git -C /home/aaron/Ops/docs fetch origin main
  git -C /home/aaron/Ops/docs \
    show origin/main:manifests/charge-spot-quest-argocd.yaml >/dev/null

  argocd app get ops-docs --hard-refresh
  argocd app sync ops-docs --revision main
  argocd app wait ops-docs --sync --timeout 300

  kubectl wait --for=jsonpath='{.status.phase}'=Active \
    namespace/charge-spot --timeout=120s
  ```
  {{% /notice %}}

  The parent `ops-docs` Application reads the `manifests` path and creates the
  child Application. The child creates namespace `charge-spot` through
  `CreateNamespace=true`. SQLite is enabled; bundled and external PostgreSQL
  stay off.

  <p> <b>3.prepare</b> `charge-spot-dingtalk` </p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl -n charge-spot create secret generic charge-spot-dingtalk \
    --from-literal=webhook_url='https://oapi.dingtalk.com/robot/send?access_token=<replace-me>' \
    --from-literal=sec_secret='SEC<replace-me>' \
    --from-literal=revoke_secret="$(openssl rand -hex 32)"
  ```
  {{% /notice %}}

  Create the Secret on the cluster only. GitOps values set `dingtalk.enabled`,
  `dingtalk.existingSecret=charge-spot-dingtalk`, and
  `dingtalk.publicBaseUrl=https://charge.72602.space`. Do not commit webhook,
  SEC, or revoke tokens.

  <p> <b>4.sync by argocd</b> </p>

  {{% notice style="transparent" %}}
  ```bash
  argocd app get charge-spot-quest --hard-refresh
  argocd app sync charge-spot-quest
  argocd app wait charge-spot-quest --sync --health --timeout 600
  ```
  {{% /notice %}}

  <p> <b>5.verify</b> </p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl -n argocd get application charge-spot-quest \
    -o jsonpath='{.spec.source.repoURL}{"\n"}{.spec.source.path}{"\n"}{.spec.source.targetRevision}{"\n"}'

  kubectl -n charge-spot get deployment charge-spot-quest \
    -o jsonpath='{range .spec.template.spec.containers[*]}{.name}{"="}{.image}{"\n"}{end}'

  kubectl -n charge-spot rollout status deployment/charge-spot-quest --timeout=600s
  kubectl -n charge-spot get pods,svc,ingress,pvc
  kubectl -n charge-spot get certificate
  kubectl -n charge-spot get pods -l app.kubernetes.io/component=postgresql
  kubectl -n charge-spot get secret charge-spot-dingtalk \
    -o go-template='{{range $k,$v := .data}}{{$k}}{{"\n"}}{{end}}'
  kubectl -n charge-spot get deployment charge-spot-quest \
    -o jsonpath='{range .spec.template.spec.containers[0].env[*]}{.name}{"\n"}{end}'

  curl -fsS https://charge.72602.space/health
  curl -fsS https://charge.72602.space/readyz
  curl -fsS -o /dev/null -w '%{content_type}\n' https://charge.72602.space/
  curl -fsS https://charge.72602.space/api/spots >/dev/null
  ```
  {{% /notice %}}

  Expected release values: chart `charge-spot-quest` version `0.1.13` and image
  `ghcr.io/aaronyang0628/charge-spot-quest@sha256:01716c11cc5598214cc053669889b8fb7585cb1faf2c72df7c33a1a52316cd82`.
  Ingress `/` returns `text/html`. PVC `charge-spot-quest-sqlite` is `Bound` at `1Gi`. TLS certificate
  `charge.72602.space-tls` should be `Ready` with expiry `2026-12-14T06:20:17Z`.

  {{% /tab %}}

  {{< /tabs >}}
{{< /tab >}}

{{< /tabs >}}

### 📦Rollback Guidance

If a deployment must be reverted, create a reviewed Git revert for
`manifests/charge-spot-quest-argocd.yaml`, push it, and sync the parent
application. The SQLite PVC and TLS certificate are **not** deleted by
rollback.

```bash
cd /home/aaron/Ops/docs
git fetch origin main
git revert --no-edit a896fa5
git push origin main
argocd app sync ops-docs --revision main
argocd app wait ops-docs --sync --health --timeout 300
```
