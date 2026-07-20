+++
title = 'Happy'
date = 2026-07-19T15:00:59+08:00
weight = 152
+++

### 🚀Installation

{{< tabs groupid="environment" style="primary" title="Environment" icon="server" >}}

{{< tab title="72602" >}}
  {{< tabs groupid="install-method-72602" title="Install By" icon="thumbtack" >}}

  {{% tab title="🐙ArgoCD" %}}
  {{% include "/Installation/SNIPPET/_argo_cd_preliminary.md" %}}

  <p> <b>1.prepare</b> DNS records </p>

  {{% notice style="transparent" %}}
  ```text
  happy.72602.online      A  47.110.67.161
  happy-api.72602.online  A  47.110.67.161
  ```
  {{% /notice %}}

  Both records are required before cert-manager can complete the HTTP-01 challenges. They currently return `NXDOMAIN`, so both Certificates remain `Pending`.

  <p> <b>2.prepare</b> database and runtime Secrets </p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl create namespace happy --dry-run=client -o yaml | kubectl apply -f -

  kubectl -n happy create secret generic happy-server \
    --from-literal=database-url='<postgresql-url-for-dedicated-happy-role>' \
    --from-literal=master-secret='<persistent-master-secret>'

  kubectl -n happy create secret docker-registry aliyun-registry \
    --docker-server=crpi-wixjy6gci86ms14e.cn-hongkong.personal.cr.aliyuncs.com \
    --docker-username='<registry-user>' \
    --docker-password='<registry-password>'
  ```
  {{% /notice %}}

  The `happy` PostgreSQL database and login role are dedicated to this application. Keep `database-url`, `master-secret`, and registry credentials as deployment-time placeholders. Preserve `master-secret`; rotating it invalidates existing server tokens and integration state.

  <p> <b>3.deploy</b> GitOps manifests </p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl apply --dry-run=client -f manifests/happy-argocd.yaml
  kubectl kustomize manifests/happy | kubectl apply --dry-run=client -f -

  git add manifests/happy-argocd.yaml manifests/happy
  git commit -m 'feat: deploy self-hosted Happy'
  git push origin main
  ```
  {{% /notice %}}

  The deployment uses the upstream Happy commit `3f161de`, a dedicated PostgreSQL database with 37 migrations, and a 20 GiB `local-path` PVC for uploaded files. The API and Web images are pinned to `3f161de`; the Web image has `https://happy-api.72602.online` baked in as its API URL. The PreSync migration hook must use package name `happy-server-self-host`.

  <p> <b>4.sync by argocd</b> </p>

  {{% notice style="transparent" %}}
  ```bash
  argocd app sync argocd/ops-docs
  argocd app sync argocd/happy
  argocd app wait argocd/happy --sync --health --timeout 600
  ```
  {{% /notice %}}

  <p> <b>5.verify</b> ArgoCD and workloads </p>

  {{% notice style="transparent" %}}
  ```bash
  argocd app get argocd/happy
  kubectl -n happy get pod,svc,ingress,pvc,certificate
  kubectl -n happy rollout status deployment/happy-api --timeout=600s
  kubectl -n happy rollout status deployment/happy-web --timeout=600s
  ```
  {{% /notice %}}

  Expected current result: the child app is at revision `0dae0d8` and reports `Synced/Healthy`; `happy-api` and `happy-web` are each `1/1 Ready`; the `happy-files` PVC is `20Gi` on `local-path`; and both Certificates are `Pending` until DNS records resolve.

  <p> <b>6.verify</b> public endpoints after DNS propagation </p>

  {{% notice style="transparent" %}}
  ```bash
  dig +short happy.72602.online A
  dig +short happy-api.72602.online A
  curl -fsS https://happy-api.72602.online/health
  curl -fsS https://happy.72602.online/ >/dev/null
  kubectl -n happy get certificate
  ```
  {{% /notice %}}

  Expected result after propagation: both names resolve to `47.110.67.161`, API health returns `200`, and both Certificates are `Ready=True`.

  <p> <b>7.connect</b> Happy CLI to the self-hosted server </p>

  {{% notice style="transparent" %}}
  ```bash
  npm install -g happy

  export HAPPY_SERVER_URL='https://happy-api.72602.online'
  export HAPPY_WEBAPP_URL='https://happy.72602.online'

  cd /path/to/project
  happy codex
  # or: happy claude
  ```
  {{% /notice %}}
  {{% /tab %}}

  {{< /tabs >}}
{{< /tab >}}

{{< /tabs >}}

### 🛎️FAQ

{{% expand title="Q1: Certificates remain Pending" %}}

```bash
dig +short happy.72602.online A
dig +short happy-api.72602.online A
kubectl -n happy get certificate,order,challenge
```

Both names must resolve publicly to `47.110.67.161`. Do not repeatedly delete or force certificate resources while DNS returns NXDOMAIN; cert-manager retries automatically after the records propagate.
{{% /expand %}}

{{% expand title="Q2: Migration reports no matching project" %}}

The upstream production Dockerfile contains the stale package filter `happy-server`. Use:

```bash
pnpm --filter happy-server-self-host exec prisma migrate deploy
```

The API container also sets `COREPACK_HOME=/tmp/corepack` because its root filesystem is read-only.
{{% /expand %}}

### ↩️Rollback

```bash
git revert <happy-deployment-commit>
git push origin main
argocd app sync argocd/ops-docs
```

Keep the `happy-files` PVC, the dedicated PostgreSQL database, and `master-secret` until data retention or restore requirements are confirmed.
