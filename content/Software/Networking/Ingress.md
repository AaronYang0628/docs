+++
tags = ["Ingress"]
title = 'Install Ingress'
date = 2024-06-07T15:00:59+08:00
weight = 90
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
  helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx

  helm repo update
  ```
    {{% /tab %}}
  {{< /tabs >}}

  {{< tabs groupid="22222" >}}
    {{% tab title="2.install chart" %}}
  ```bash
  helm install ingress-nginx/ingress-nginx --generate-name
  ```
    {{% /tab %}}
  {{< /tabs >}}

  {{< tabs groupid="tips" >}}
    {{% tab style="tip" %}}
  for more information, you can check 🔗[https://artifacthub.io/packages/helm/prometheus-community/prometheus](https://artifacthub.io/packages/helm/prometheus-community/prometheus)
  ```shell

    helm repo add ay-helm-mirror https://aaronyang0628.github.io/helm-chart-mirror/charts && helm install ay-helm-mirror/ingress-nginx --generate-name --version 4.11.3
  ```
    {{% /tab %}}
  {{< /tabs >}}

{{< /tab >}}

{{< tab title="ArgoCD" style="transparent">}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  2. argoCD has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>

  {{< tabs groupid="2222" >}}
    {{% tab title="2.prepare `ingress-nginx.yaml`" %}}
    apiVersion: argoproj.io/v1alpha1
    kind: Application
    metadata:
      name: ingress-nginx
    spec:
      syncPolicy:
        syncOptions:
        - CreateNamespace=true
      project: default
      source:
        repoURL: https://aaronyang0628.github.io/helm-chart-mirror/charts
        chart: ingress-nginx
        targetRevision: 4.11.3
        helm:
          releaseName: ingress-nginx
          values: |
            controller:
              image:
                registry: m.daocloud.io
                image: registry.k8s.io/ingress-nginx/controller
                tag: "v1.9.5"
                pullPolicy: IfNotPresent
              service:
                enabled: true
                type: NodePort
                nodePorts:
                  http: 32080
                  https: 32443
                  tcp:
                    8080: 32808
              admissionWebhooks:
                enabled: true
                patch:
                  enabled: true
                  image:
                    registry: m.daocloud.io
                    image: registry.k8s.io/ingress-nginx/kube-webhook-certgen
                    tag: v20231011-8b53cabe0
                    pullPolicy: IfNotPresent
            defaultBackend:
              enabled: false
      destination:
        server: https://kubernetes.default.svc
        namespace: basic-components
    {{% /tab %}}
  {{< /tabs >}}


  {{< tabs groupid="3333" >}}
    {{% tab title="3.apply to k8s " %}}
  ```bash
    kubectl -n argocd apply -f ingress-nginx.yaml
  ```
    {{% /tab %}}
  {{< /tabs >}}

  {{< tabs groupid="4444" >}}
    {{% tab title="4.sync by argocd" %}}
  ```bash
    argocd app sync argocd/ingress-nginx
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