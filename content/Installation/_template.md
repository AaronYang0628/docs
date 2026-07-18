+++
tags = ["TEMPLATE"]
title = 'Install MD TEMPLATE'
date = 2024-06-07T15:00:59+08:00
draft = true
weight = 270
+++

### 🚀Installation

<!-- Keep only environments and installation methods that were actually used. -->

{{< tabs groupid="environment" style="primary" title="Environment" icon="server" >}}

{{< tab title="ZJLAB" >}}
  {{< tabs groupid="install-method-zjlab" title="Install By" icon="thumbtack" >}}

  {{% tab title="🐙ArgoCD" %}}
  {{% include "/Installation/SNIPPET/_argo_cd_preliminary.md" %}}

  <p> <b>1.prepare</b> `xxxxx-credentials` </p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl -n application create secret generic xxxxx-credentials \
    --from-literal=password='<replace-me>'
  ```
  {{% /notice %}}

  <p> <b>2.prepare</b> `deploy-xxxxx.yaml` </p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl -n argocd apply -f - <<'EOF'
  apiVersion: argoproj.io/v1alpha1
  kind: Application
  metadata:
    name: xxxxx
    namespace: argocd
  spec: {}
  EOF
  ```
  {{% /notice %}}

  <p> <b>3.sync by argocd</b> </p>

  {{% notice style="transparent" %}}
  ```bash
  argocd app sync argocd/xxxxx
  ```
  {{% /notice %}}

  <p> <b>4.verify</b> </p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl -n application get pods,svc,ingress
  ```
  {{% /notice %}}
  {{% /tab %}}

  {{% tab title="🐳Docker" %}}
  {{% include "/Installation/SNIPPET/_container_preliminary.md" %}}

  <p> <b>1.run container</b> </p>

  {{% notice style="transparent" %}}
  ```bash
  docker run -d --name xxxxx xxxxx:tag
  ```
  {{% /notice %}}

  <p> <b>2.verify</b> </p>

  {{% notice style="transparent" %}}
  ```bash
  docker ps --filter name=xxxxx
  ```
  {{% /notice %}}
  {{% /tab %}}

  {{< /tabs >}}
{{< /tab >}}

{{< tab title="72602" >}}
  {{< tabs groupid="install-method-72602" title="Install By" icon="thumbtack" >}}

  {{% tab title="🐙ArgoCD" %}}
  {{% include "/Installation/SNIPPET/_argo_cd_preliminary.md" %}}

  <p> <b>1.prepare</b> `deploy-xxxxx.yaml` </p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl -n argocd apply -f deploy-xxxxx.yaml
  ```
  {{% /notice %}}

  <p> <b>2.sync by argocd</b> </p>

  {{% notice style="transparent" %}}
  ```bash
  argocd app sync argocd/xxxxx
  ```
  {{% /notice %}}

  <p> <b>3.verify</b> </p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl -n application get pods,svc,ingress
  ```
  {{% /notice %}}
  {{% /tab %}}

  {{% tab title="📦Helm" %}}
  {{% include "/Installation/SNIPPET/_helm_preliminary.md" %}}

  <p> <b>1.install chart</b> </p>

  {{% notice style="transparent" %}}
  ```bash
  helm upgrade --install xxxxx repo/chart \
    --namespace application \
    --create-namespace
  ```
  {{% /notice %}}

  <p> <b>2.verify</b> </p>

  {{% notice style="transparent" %}}
  ```bash
  helm -n application status xxxxx
  ```
  {{% /notice %}}
  {{% /tab %}}

  {{< /tabs >}}
{{< /tab >}}

{{< /tabs >}}

### 🛎️FAQ

{{% expand title="Q1: deployment verification failed" %}}

```bash
kubectl -n application get events --sort-by=.lastTimestamp
```

Record the verified symptom, root cause, corrected operation, rollback, and expected result here.
{{% /expand %}}
