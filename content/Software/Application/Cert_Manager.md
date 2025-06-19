+++
tags = ["Cert Manager"]
title = 'Install Cert Manager'
date = 2024-06-07T15:00:59+08:00
weight = 30
+++


### Installation

{{< tabs groupid="prometheus" style="primary" title="Install By" icon="thumbtack" >}}

{{< tab title="Helm" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/kubernetes/cluster/index.html" target="_blank">link</a> </p></br>
  2. Helm binary has installed, if not check 🔗<a href="/docs/software/binary/helm/index.html" target="_blank">link</a> </p></br>

  <p> <b>1.get helm repo </b></p>

  {{% notice style="transparent" %}}
  ```bash
  helm repo add ay-helm-mirror https://aaronyang0628.github.io/helm-chart-mirror/charts
  helm repo update
  ```
  {{% /notice %}}

  <p> <b>2.install chart </b></p>

  {{% notice style="transparent" %}}
  ```bash
  helm install ay-helm-mirror/kube-prometheus-stack --generate-name
  ```
  {{% /notice %}}

  {{% notice style="important" title="Using Proxy" %}} 
  for more information, you can check 🔗[https://artifacthub.io/packages/helm/prometheus-community/prometheus](https://artifacthub.io/packages/helm/prometheus-community/prometheus)
  {{% /notice %}}

{{< /tab >}}

{{< tab title="ArgoCD" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/kubernetes/cluster/index.html" target="_blank">link</a> </p></br>
  2. ArgoCD has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  3. Helm binary has installed, if not check 🔗<a href="/docs/software/binary/helm/index.html" target="_blank">link</a> </p></br>

  <p> <b>1.prepare</b> `cert-manager.yaml` </p>

  {{% notice style="transparent" %}}
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
      targetRevision: 1.17.2
      helm:
        releaseName: cert-manager
        values: |
          installCRDs: true
          image:
            repository: m.daocloud.io/quay.io/jetstack/cert-manager-controller
            tag: v1.17.2
          webhook:
            image:
              repository: m.daocloud.io/quay.io/jetstack/cert-manager-webhook
              tag: v1.17.2
          cainjector:
            image:
              repository: m.daocloud.io/quay.io/jetstack/cert-manager-cainjector
              tag: v1.17.2
          acmesolver:
            image:
              repository: m.daocloud.io/quay.io/jetstack/cert-manager-acmesolver
              tag: v1.17.2
          startupapicheck:
            image:
              repository: m.daocloud.io/quay.io/jetstack/cert-manager-startupapicheck
              tag: v1.17.2
    destination:
      server: https://kubernetes.default.svc
      namespace: basic-components
  EOF
  ```
  {{% /notice %}}

  <p> <b>3.sync by argocd</b></p>

  {{% notice style="transparent" %}}
  ```bash
  argocd app sync argocd/cert-manager
  ```
  {{% /notice %}}

  <p> <b>4.prepare self-signed.yaml</b></p>

  {{% notice style="transparent" %}}
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
  {{% /notice %}}


{{< /tab >}}


{{< tab title="Docker" style="transparent" >}}
 <p> <b>Preliminary </b></p>
  1. Docker|Podman|Buildah has installed, if not check 🔗<a href="/docs/software/container/index.html" target="_blank">link</a> </p></br>
  

  {{% notice style="important" title="Using Proxy" %}} 
  you can run an addinational **daocloud** image to accelerate your pulling, check [Daocloud Proxy](daocloud/index.html)
  {{% /notice %}}

{{< /tab >}}


{{< /tabs >}}



### FAQ

{{% expand title="Q1: Show me almost **endless** possibilities" %}}
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