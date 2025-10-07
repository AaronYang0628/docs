+++
tags = ["Flink"]
title = 'Install Flink Operator'
date = 2025-06-07T15:00:59+08:00
weight = 60
+++



### Installation

{{< tabs groupid="prometheus" style="primary" title="Install By" icon="thumbtack" >}}

{{< tab title="Helm" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  2. Helm has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  3. Cert-manager has installed, if not check 🔗<a href="/docs/software/application/cert_manager/index.html" target="_blank">link</a> </p></br>

  <p> <b>1.get helm repo </b></p>

  {{% notice style="transparent" %}}
  ```bash
  helm repo add flink-operator-repo https://downloads.apache.org/flink/flink-kubernetes-operator-1.11.0/
  helm repo update
  ```
  latest version : 🔗[https://flink.apache.org/downloads/#apache-flink-kubernetes-operator](https://flink.apache.org/downloads/#apache-flink-kubernetes-operator)
  {{% /notice %}}

  <p> <b>2.install chart </b></p>

  {{% notice style="transparent" %}}
  ```bash
  helm install --create-namespace -n flink flink-kubernetes-operator flink-operator-repo/flink-kubernetes-operator --set image.repository=m.lab.zverse.space/ghcr.io/apache/flink-kubernetes-operator --set image.tag=1.11.0 --set webhook.create=false
  ```
  {{% /notice %}}

  {{% notice style="tip" title="Reference" %}} 
  for more information, you can check 🔗[https://nightlies.apache.org/flink/flink-kubernetes-operator-docs-main/zh/docs/try-flink-kubernetes-operator/quick-start/](https://nightlies.apache.org/flink/flink-kubernetes-operator-docs-main/zh/docs/try-flink-kubernetes-operator/quick-start/)
  {{% /notice %}}

{{< /tab >}}

{{< tab title="ArgoCD" style="transparent">}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  2. ArgoCD has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  3. Cert-manager has installed on argocd and the clusterissuer has a named <b>self-signed-ca-issuer</b> service , if not check 🔗<a href="/docs/software/application/cert_manager/index.html" target="_blank">link</a> </p></br>
  4. Ingres has installed on argoCD, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>

  <p> <b>2.prepare</b> `flink-operator.yaml` </p>

  {{% notice style="transparent" %}}
  ```yaml
  kubectl -n argocd apply -f - << EOF
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
      repoURL: https://downloads.apache.org/flink/flink-kubernetes-operator-1.11.0
      chart: flink-kubernetes-operator
      targetRevision: 1.11.0
      helm:
        releaseName: flink-operator
        values: |
          image:
            repository: m.daocloud.io/ghcr.io/apache/flink-kubernetes-operator
            pullPolicy: IfNotPresent
            tag: "1.11.0"
        version: v3
    destination:
      server: https://kubernetes.default.svc
      namespace: flink
  EOF
  ```
  {{% /notice %}}

  <p> <b>3.sync by argocd</b></p>

  {{% notice style="transparent" %}}
  ```bash
  argocd app sync argocd/flink-operator
  ```
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