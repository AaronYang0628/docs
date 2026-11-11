+++
title = "Install (ArgoCD)"
description = "Deploy payee-bench to 72602 via ArgoCD GitOps"
url = "/Installation/Application/PayeeBench/install/"
+++

### 🚀Installation

{{< tabs groupid="environment" style="primary" title="Environment" icon="server" >}}

{{< tab title="72602" >}}
  {{< tabs groupid="install-method-72602" title="Install By" icon="thumbtack" >}}

  {{% tab title="🐙ArgoCD" %}}
  {{% include "/Installation/SNIPPET/_argo_cd_preliminary.md" %}}

  <p> <b>1.prepare</b> `payee-bench-runtime` </p>

  Build the Secret from the protected runtime env file, never from arguments or Git:

  {{% notice style="transparent" %}}
  ```bash
  kubectl create namespace payee-bench --dry-run=client -o yaml | kubectl apply -f -
  kubectl -n payee-bench create secret generic payee-bench-runtime \
    --from-env-file=/home/aaron/.payee-bench-migrate/runtime.env \
    --dry-run=client -o yaml | kubectl apply -f -
  ```
  {{% /notice %}}

  Keep `CARD_ENCRYPTION_KEY` fixed for the life of the database. The Secret holds the Alipay app id, seller id, app private key, Alipay public key, `APP_SECRET`, and the admin password.

  <p> <b>2.prepare</b> image </p>

  The 72602 node has no registry login, so build and import into containerd:

  {{% notice style="transparent" %}}
  ```bash
  git clone https://github.com/AaronYang0628/payee-bench.git /home/aaron/build/payee-bench
  cd /home/aaron/build/payee-bench
  podman build --format docker \
    --build-arg HTTP_PROXY=http://192.168.0.25:17890 \
    --build-arg HTTPS_PROXY=http://192.168.0.25:17890 \
    -t docker.io/library/payee-bench:669a90e .
  podman save --format oci-archive -o /tmp/payee-bench.tar docker.io/library/payee-bench:669a90e
  sudo k3s ctr -n k8s.io images import /tmp/payee-bench.tar
  ```
  {{% /notice %}}

  <p> <b>3.prepare</b> `manifests/payee-bench` </p>

  The parent `ops-docs` Application reads `manifests/kustomization.yaml`; its `resources` list must include every top-level file plus `payee-bench/namespace.yaml`, `pvc.yaml`, `deployment.yaml`, `service.yaml`, and `ingress.yaml`. The Namespace carries sync-wave `-1`.

  <p> <b>4.sync by argocd</b> </p>

  {{% notice style="transparent" %}}
  ```bash
  argocd app get ops-docs --hard-refresh
  argocd app wait ops-docs --sync --health --timeout 300
  ```
  {{% /notice %}}

  <p> <b>5.verify</b> </p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl -n payee-bench rollout status deployment/payee-bench --timeout=300s
  kubectl -n payee-bench get pods,svc,ingress,pvc,certificate
  curl -fsS https://pay.72602.space/api/health
  curl -fsS https://pay.72602.space/api/config
  ```
  {{% /notice %}}

  `/api/config` must report `mode=production` and `paymentConfigured=true`. Deleting the Pod must leave the product and stock intact; the PVC is `payee-bench-data`.

  {{% /tab %}}

  {{< /tabs >}}
{{< /tab >}}

{{< /tabs >}}

### 🛎️FAQ

{{% expand title="Q1: payment gateway fails after deploy" %}}

The Pod needs direct egress to `openapi.alipay.com:443`. Verify with a signed `alipay.trade.query` through the app; a `confirmationPending` response indicates the request or response verification failed. Do not rotate `CARD_ENCRYPTION_KEY` to fix payment errors.

{{% /expand %}}
