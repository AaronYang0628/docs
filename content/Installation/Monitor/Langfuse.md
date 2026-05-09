+++
tags = ["Langfuse"]
title = 'Install Langfuse'
date = 2026-05-08T15:00:59+08:00
weight = 120
+++

Official Documentation: [https://langfuse.com/docs](https://langfuse.com/docs)

### 🚀Installation

{{< tabs groupid="langfuse" style="primary" title="Install By" icon="thumbtack" >}}

{{< tab title="📦Helm" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes is installed; if not, check 🔗<a href="/docs/kubernetes/cluster/index.html" target="_blank">link</a> </p></br>
  2. Helm is installed; if not, check 🔗<a href="/docs/Installation/binary/helm/index.html" target="_blank">link</a> </p></br>
  3. Ingress is installed; if not, check 🔗<a href="/docs/Installation/networking/ingress/index.html" target="_blank">link</a> </p></br>
  4. Cert-Manager is installed; if not, check 🔗<a href="/docs/Installation/networking/cert-manager/index.html" target="_blank">link</a> </p></br>

  <p> <b>1.prepare namespace and secrets</b> </p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl get namespaces monitor > /dev/null 2>&1 || kubectl create namespace monitor

  kubectl -n monitor create secret generic langfuse-secret \
    --from-literal=NEXTAUTH_SECRET=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 32) \
    --from-literal=SALT=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 32)
  ```
  {{% /notice %}}

  <p> <b>2.prepare `langfuse.values.yaml`</b> </p>

  {{% notice style="transparent" %}}
  ```yaml
  # Minimal example. Adjust storage classes, resource limits, and domain before production use.
  ingress:
    enabled: true
    className: nginx
    annotations:
      cert-manager.io/cluster-issuer: self-signed-ca-issuer
    hosts:
      - host: langfuse.dev.72602.online
        paths:
          - path: /
            pathType: Prefix
    tls:
      - secretName: langfuse.dev.72602.online-tls
        hosts:
          - langfuse.dev.72602.online

  env:
    NEXTAUTH_URL: https://langfuse.dev.72602.online
    TELEMETRY_ENABLED: "false"

  # Use external databases in production.
  postgresql:
    enabled: true
  redis:
    enabled: true
  clickhouse:
    enabled: true
  ```
  {{% /notice %}}

  <p> <b>3.install chart</b> </p>

  {{% notice style="transparent" %}}
  ```bash
  helm repo add langfuse https://langfuse.github.io/langfuse-k8s
  helm repo update

  helm upgrade --install langfuse langfuse/langfuse \
    -n monitor \
    -f langfuse.values.yaml \
    --atomic
  ```
  {{% /notice %}}

  <p> <b>4.monitor status</b></p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl -n monitor get pods
  kubectl -n monitor get ingress
  kubectl -n monitor logs deploy/langfuse-web --tail=100
  ```
  {{% /notice %}}

{{< /tab >}}

{{< tab title="🐙ArgoCD" style="transparent" >}}
  {{% include "/Installation/SNIPPET/_argo_cd_preliminary.md" %}}

  <p> <b>1.prepare</b> `langfuse-app.yaml` </p>

  {{% notice style="transparent" %}}
  ```yaml
  kubectl -n argocd apply -f - <<'EOF'
  apiVersion: argoproj.io/v1alpha1
  kind: Application
  metadata:
    name: langfuse
    namespace: argocd
  spec:
    project: default
    source:
      repoURL: https://langfuse.github.io/langfuse-k8s
      chart: langfuse
      targetRevision: 1.0.0
      helm:
        values: |
          ingress:
            enabled: true
            className: nginx
            annotations:
              cert-manager.io/cluster-issuer: self-signed-ca-issuer
            hosts:
              - host: langfuse.dev.72602.online
                paths:
                  - path: /
                    pathType: Prefix
            tls:
              - secretName: langfuse.dev.72602.online-tls
                hosts:
                  - langfuse.dev.72602.online
          env:
            NEXTAUTH_URL: https://langfuse.dev.72602.online
            TELEMETRY_ENABLED: "false"
          postgresql:
            enabled: true
          redis:
            enabled: true
          clickhouse:
            enabled: true
    destination:
      server: https://kubernetes.default.svc
      namespace: monitor
    syncPolicy:
      syncOptions:
        - CreateNamespace=true
        - ServerSideApply=true
  EOF
  ```
  {{% /notice %}}

  <p> <b>2.sync by argocd</b></p>

  {{% notice style="transparent" %}}
  ```bash
  argocd app sync argocd/langfuse
  ```
  {{% /notice %}}

  <p> <b>3.monitor status</b></p>

  {{% notice style="transparent" %}}
  ```bash
  argocd app get argocd/langfuse
  kubectl -n monitor get pods
  kubectl -n monitor get ingress
  ```
  {{% /notice %}}

{{< /tab >}}

{{< /tabs >}}

### Verify

{{% notice style="transparent" %}}
```bash
K8S_MASTER_IP=$(kubectl get nodes --selector=node-role.kubernetes.io/control-plane -o jsonpath='{$.items[0].status.addresses[?(@.type=="InternalIP")].address}')
echo "$K8S_MASTER_IP langfuse.dev.72602.online" | sudo tee -a /etc/hosts

curl -kI https://langfuse.dev.72602.online
```
{{% /notice %}}

If response status is `200` or `302`, open `https://langfuse.dev.72602.online` in browser.
