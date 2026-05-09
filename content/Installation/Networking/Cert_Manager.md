+++
tags = ["Cert Manager"]
title = 'Install Cert Manager'
date = 2024-06-07T15:00:59+08:00
weight = 30
+++


### Installation

{{< tabs groupid="prometheus" style="primary" title="Install By" icon="thumbtack" >}}

{{< tab title="Helm✅" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes is installed; if not, check 🔗<a href="/docs/kubernetes/cluster/index.html" target="_blank">link</a> </p></br>
  2. Helm binary is installed; if not, check 🔗<a href="/docs/Installation/binary/helm/index.html" target="_blank">link</a> </p></br>

  <p> <b>1.get helm repo </b></p>

  {{% notice style="transparent" %}}
  ```bash
  helm repo add cert-manager-repo https://charts.jetstack.io
  helm repo update
  ```
  {{% /notice %}}

  <p> <b>2.install chart </b></p>

  {{% notice style="transparent" %}}
  ```bash
  helm install cert-manager-repo/cert-manager --generate-name --version 1.20.2
  ```
  {{% /notice %}}

  {{% notice style="important" title="Using Mirror" %}} 
  ```shell
  helm repo add ay-helm-mirror https://aaronyang0628.github.io/helm-chart-mirror/charts \
    && helm install ay-helm-mirror/cert-manager --generate-name --version 1.20.2
  ```
  for more information, you can check 🔗[https://aaronyang0628.github.io/helm-chart-mirror/](https://aaronyang0628.github.io/helm-chart-mirror/)
  {{% /notice %}}

{{< /tab >}}

{{< tab title="ArgoCD✅" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes is installed; if not, check 🔗<a href="/docs/kubernetes/cluster/index.html" target="_blank">link</a> </p></br>
  2. ArgoCD is installed; if not, check 🔗<a href="/docs/Installation/cicd/argocd/index.html" target="_blank">link</a> </p></br>
  3. Helm binary is installed; if not, check 🔗<a href="/docs/Installation/binary/helm/index.html" target="_blank">link</a> </p></br>

  <p> <b>1.prepare</b> `cert-manager.yaml` </p>

  {{< tabs >}}
  {{% tab title="Github Mirror" %}}
  ```yaml
  kubectl -n argocd apply -f - << EOF
  apiVersion: argoproj.io/v1alpha1
  kind: Application
  metadata:
    name: cert-manager
  spec:
    syncPolicy:
      syncOptions:
      - CreateNamespace=true
    project: default
    source:
      repoURL: https://aaronyang0628.github.io/helm-chart-mirror/charts
      chart: cert-manager
      targetRevision: 1.20.2
      helm:
        releaseName: cert-manager
        values: |
          installCRDs: true
          image:
            repository: m.daocloud.io/quay.io/jetstack/cert-manager-controller
            tag: v1.20.2
          webhook:
            image:
              repository: m.daocloud.io/quay.io/jetstack/cert-manager-webhook
              tag: v1.20.2
          cainjector:
            image:
              repository: m.daocloud.io/quay.io/jetstack/cert-manager-cainjector
              tag: v1.20.2
          acmesolver:
            image:
              repository: m.daocloud.io/quay.io/jetstack/cert-manager-acmesolver
              tag: v1.20.2
          startupapicheck:
            image:
              repository: m.daocloud.io/quay.io/jetstack/cert-manager-startupapicheck
              tag: v1.20.2
    destination:
      server: https://kubernetes.default.svc
      namespace: basic-components
  EOF
  ```
  {{% /tab %}}
  {{% tab title="Official Chart" %}}
  ```yaml
  kubectl -n argocd apply -f - << EOF
  apiVersion: argoproj.io/v1alpha1
  kind: Application
  metadata:
    name: cert-manager
  spec:
    syncPolicy:
      syncOptions:
      - CreateNamespace=true
    project: default
    source:
      repoURL: https://charts.jetstack.io
      chart: cert-manager
      targetRevision: 1.20.2
      helm:
        releaseName: cert-manager
        values: |
          installCRDs: true
          image:
            repository: m.daocloud.io/quay.io/jetstack/cert-manager-controller
            tag: v1.20.2
          webhook:
            image:
              repository: m.daocloud.io/quay.io/jetstack/cert-manager-webhook
              tag: v1.20.2
          cainjector:
            image:
              repository: m.daocloud.io/quay.io/jetstack/cert-manager-cainjector
              tag: v1.20.2
          acmesolver:
            image:
              repository: m.daocloud.io/quay.io/jetstack/cert-manager-acmesolver
              tag: v1.20.2
          startupapicheck:
            image:
              repository: m.daocloud.io/quay.io/jetstack/cert-manager-startupapicheck
              tag: v1.20.2        
    destination:
      server: https://kubernetes.default.svc
      namespace: basic-components
  EOF
  ```
  {{% /tab %}}
  {{< /tabs >}}

  <p> <b>2.sync by argocd</b></p>

  {{% notice style="transparent" %}}
  ```bash
  argocd app sync argocd/cert-manager
  ```
  {{% /notice %}}

{{< /tab >}}


{{< tab title="Docker" style="transparent" >}}
 <p> <b>Preliminary </b></p>
  1. Docker|Podman|Buildah is installed; if not, check 🔗<a href="/docs/Installation/container/index.html" target="_blank">link</a> </p></br>

  <p> <b>1.just run</b></p>
  {{% notice style="transparent" %}}
  ```bash
  docker run --name cert-manager -e ALLOW_EMPTY_PASSWORD=yes bitnami/cert-manager:latest
  ```
  {{% /notice %}}

  {{% notice style="important" title="Using Proxy" %}} 
  you can run an addinational **daocloud** image to accelerate your pulling, check [Daocloud Proxy](/docs/kubernetes/proxy/daocloud/index.html)
  ```shell
  docker run --name cert-manager \
    -e ALLOW_EMPTY_PASSWORD=yes 
    m.daocloud.io/docker.io/bitnami/cert-manager:latest
  ```
  {{% /notice %}}

{{< /tab >}}

{{< tab title="CURL" style="transparent" >}}
 <p> <b>Preliminary </b></p>
  1. Kubernetes is installed; if not, check 🔗<a href="/docs/kubernetes/cluster/index.html" target="_blank">link</a> </p></br>

  <p> <b>1.just run</b></p>
  {{% notice style="transparent" %}}
  ```bash
  kubectl create -f https://github.com/jetstack/cert-manager/releases/download/v1.20.2/cert-manager.yaml
  ```
  {{% /notice %}}

{{< /tab >}}


{{< /tabs >}}


### Prepare Certificate Issuer

{{< tabs >}}
{{% tab title="self-signed" %}}
```yaml
kubectl apply  -f - <<EOF
---
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  namespace: basic-components
  name: self-signed-issuer
spec:
  selfSigned: {}

---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  namespace: basic-components
  name: my-self-signed-ca
spec:
  isCA: true
  commonName: my-self-signed-ca
  secretName: root-secret
  privateKey:
    algorithm: ECDSA
    size: 256
  issuerRef:
    name: self-signed-issuer
    kind: Issuer
    group: cert-manager.io

---
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: self-signed-ca-issuer
spec:
  ca:
    secretName: root-secret
EOF
```
{{% /tab %}}
{{% tab title="let's encrypt" %}}
```yaml
kubectl -n kube-system apply -f - << EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: lets-encrypt
spec:
  acme:
    email: aaron19940628@gmail.com
    server: https://acme-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      name: letsencrypt-account-key
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```
{{% /tab %}}
{{< /tabs >}}

### FAQ

{{% expand title="Q1: cert-manager Pods are not ready" %}}
**Symptom**
- `cert-manager`, `cert-manager-webhook`, or `cert-manager-cainjector` Pods keep restarting.

**Check**
```bash
kubectl -n basic-components get pods | grep cert-manager
kubectl -n basic-components describe pod -l app.kubernetes.io/name=cert-manager
kubectl -n basic-components logs deploy/cert-manager --tail=100
```

**Fix**
- Ensure CRDs are installed (`installCRDs: true` in Helm values).
- Re-sync app: `argocd app sync argocd/cert-manager`.
- If image pull fails, switch to mirror image settings shown above.

**Expected**
- All cert-manager Pods become `Running` and `READY 1/1`.
{{% /expand %}}

{{% expand title="Q2: Certificate stays in Pending or Ingress has no TLS secret" %}}
**Symptom**
- Ingress TLS secret is not created, or `Certificate` status does not become `Ready`.

**Check**
```bash
kubectl get clusterissuer
kubectl -n basic-components get certificate
kubectl -n basic-components describe certificate <certificate-name>
kubectl -n basic-components get secret root-secret
```

**Fix**
- Confirm `ClusterIssuer` exists (`self-signed-ca-issuer` or `lets-encrypt`).
- Ensure Ingress annotation matches issuer name: `cert-manager.io/cluster-issuer`.
- Re-apply issuer manifest and then re-apply ingress.

**Expected**
- Target certificate shows `Ready=True` and TLS secret exists.
{{% /expand %}}



### FAQ

{{% expand title="Q1: The browser doesn't trust this **self-signed** certificate" %}}

Basically, you need to import the certificate into your browser.
```shell
kubectl -n basic-components get secret root-secret -o jsonpath='{.data.tls\.crt}' | base64 -d > cert-manager-self-signed-ca-secret.crt
```

And then import it into your browser.


{{% /expand %}}


{{% expand title="Q2: Show me almost **endless** possibilities" %}}
You can add standard markdown syntax:

- multiple paragraphs
- bullet point lists
- _emphasized_, **bold** and even **_bold emphasized_** text
- [links](https://example.com)
- etc.

```plaintext
...and even source code
```

> the possibilities are endless (almost - including other shortcodes may or may not work)
{{% /expand %}}
