+++
tags = ["Flink"]
title = 'Install Flink Operator'
date = 2025-06-07T15:00:59+08:00
weight = 5
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
  3. ingres has installed on argoCD, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>

  {{< tabs groupid="tips" >}}
    {{% tab style="important" %}}
  **cert-manager** has installed on argocd and the clusterissuer has a named `self-signed-ca-issuer`service, , if not check 🔗[link](argo/argo-cd/application/cert_manager/index.html)
    {{% /tab %}}
  {{< /tabs >}}


  {{< tabs groupid="1111" >}}
    {{% tab title="1.preare secret" %}}
  ```bash
  kubectl get namespaces monitor > /dev/null 2>&1 || kubectl create namespace monitor
    kubectl -n monitor create secret generic prometheus-stack-credentials \
    --from-literal=grafana-username=admin \
    --from-literal=grafana-password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16)
  ```
    {{% /tab %}}
  {{< /tabs >}}

  {{< tabs groupid="2222" >}}
    {{% tab title="2.prepare `flink-operator.yaml`" %}}
    apiVersion: argoproj.io/v1alpha1
    kind: Application
    metadata:
      name: flink-operator
    spec:
      syncPolicy:
        syncOptions:
        - CreateNamespace=true
      project: default
      source:
        repoURL: https://downloads.apache.org/flink/flink-kubernetes-operator-1.8.0
        chart: flink-kubernetes-operator
        targetRevision: 1.8.0
        helm:
          releaseName: flink-operator
          values: |
            image:
              repository: m.daocloud.io/ghcr.io/apache/flink-kubernetes-operator
              pullPolicy: IfNotPresent
              tag: "1.8.0"
          version: v3
      destination:
        server: https://kubernetes.default.svc
        namespace: flink
    {{% /tab %}}
  {{< /tabs >}}


  {{< tabs groupid="3333" >}}
    {{% tab title="3.apply to k8s " %}}
  ```bash
    kubectl -n argocd apply -f flink-operator.yaml
  ```
    {{% /tab %}}
  {{< /tabs >}}



  {{< tabs groupid="4444" >}}
    {{% tab title="4.sync by argocd" %}}
  ```bash
    argocd app sync argocd/flink-operator
  ```
    {{% /tab %}}
  {{< /tabs >}}

  {{< tabs groupid="666666" >}}
    {{% tab title="6.check web dashboard" %}}
  ```bash
    > add `$K8S_MASTER_IP grafana.dev.tech` to **/etc/hosts**

    > add `$K8S_MASTER_IP prometheus.dev.tech` to **/etc/hosts**
  ```
    {{% /tab %}}
    
  {{< /tabs >}}
  prometheus-srver: <a href="https://prometheus.dev.tech:32443/" target="_blank">https://prometheus.dev.tech:32443/</a> </p></br>
  grafana-console: <a href="https://grafana.dev.tech:32443/" target="_blank">https://grafana.dev.tech:32443/</a> </p></br>


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