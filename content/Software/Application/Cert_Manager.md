+++
tags = ["Cert Manager"]
title = 'Install Cert Manager'
date = 2024-06-07T15:00:59+08:00
weight = 2
+++


### Installation

{{< tabs groupid="prometheus" style="primary" title="Install By" icon="thumbtack" >}}

{{< tab title="Helm" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  2. Helm has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>

  {{< tabs groupid="1111" >}}
    {{% tab title="1.get helm repo" %}}
  ```bash
  helm repo add ay-helm-mirror https://aaronyang0628.github.io/helm-chart-mirror/charts
  helm repo update
  ```
    {{% /tab %}}
  {{< /tabs >}}

  {{< tabs groupid="22222" >}}
    {{% tab title="2.install chart" %}}
  ```bash
  helm install ay-helm-mirror/kube-prometheus-stack --generate-name
  ```
    {{% /tab %}}
  {{< /tabs >}}

  {{< tabs groupid="tips" >}}
    {{% tab style="tip" %}}
  for more information, you can check 🔗[https://artifacthub.io/packages/helm/prometheus-community/prometheus](https://artifacthub.io/packages/helm/prometheus-community/prometheus)
    {{% /tab %}}
  {{< /tabs >}}

{{< /tab >}}

{{< tab title="ArgoCD" style="transparent">}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  2. argoCD has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>

  {{< tabs groupid="2222" >}}
    {{% tab title="2.prepare `cert-manager.yaml`" %}}
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
    {{% /tab %}}
  {{< /tabs >}}


  {{< tabs groupid="3333" >}}
    {{% tab title="3.apply to k8s " %}}
  ```bash
    kubectl -n argocd apply -f cert-manager.yaml
  ```
    {{% /tab %}}
  {{< /tabs >}}

  {{< tabs groupid="4444" >}}
    {{% tab title="4.sync by argocd" %}}
  ```bash
    argocd app sync argocd/cert-manager
  ```
    {{% /tab %}}
  {{< /tabs >}}

  {{< tabs groupid="5555" >}}
    {{% tab title="5.prepare `self-signed.yaml`" %}}
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
    {{% /tab %}}
  {{< /tabs >}}

  {{< tabs groupid="666666" >}}
    {{% tab title="6.apply to k8s" %}}
  ```bash
  kubectl apply -f self-signed.yaml
  ```
    {{% /tab %}}
    
  {{< /tabs >}}



{{< /tab >}}


{{< tab title="Docker Compose" style="default" >}}
  install based on docker
  {{< tabs groupid="tabs-example-language" >}}
    {{% tab title="shell" %}}
  ```bash
  echo  "start from head is important"
  ```
    {{% /tab %}}
  {{< /tabs >}}

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