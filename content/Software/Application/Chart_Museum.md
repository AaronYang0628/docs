+++
tags = ["Chart Museum"]
title = 'Install Chart Museum'
date = 2024-06-07T15:00:59+08:00
weight = 31
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

  {{< tabs groupid="2222" >}}
    {{% tab title="2.prepare `chart-museum.yaml`" %}}
    apiVersion: argoproj.io/v1alpha1
    kind: Application
    metadata:
      name: chart-museum
    spec:
      syncPolicy:
        syncOptions:
          - CreateNamespace=true
      project: default
      source:
        repoURL: https://chartmuseum.github.io/charts
        chart: chartmuseum
        targetRevision: 3.10.3
        helm:
          releaseName: chart-museum
          values: |
            replicaCount: 1
            image:
              repository: ghcr.io/helm/chartmuseum
            persistence:
              enabled: false
              storageClass: ""
            volumePermissions:
              image:
                registry: m.daocloud.io/docker.io
            ingress:
              enabled: true
              ingressClassName: nginx
              hosts:
                - name: chartmuseum.ay.dev
                  path: /?(.*)
                  tls: true
      destination:
        server: https://kubernetes.default.svc
        namespace: basic-components
    {{% /tab %}}
  {{< /tabs >}}


  {{< tabs groupid="3333" >}}
    {{% tab title="3.apply to k8s " %}}
  ```bash
    kubectl -n argocd apply -f chart-museum.yaml
  ```
    {{% /tab %}}
  {{< /tabs >}}

  {{< tabs groupid="4444" >}}
    {{% tab title="4.sync by argocd" %}}
  ```bash
    argocd app sync argocd/chart-museum
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


### Uploading a Chart Package
<sub>*Follow **"How to Run"** section below to get ChartMuseum up and running at ht<span>tp:/</span>/localhost:8080*<sub>

First create `mychart-0.1.0.tgz` using the [Helm CLI](https://docs.helm.sh/using_helm/#installing-helm):
```
cd mychart/
helm package .
```

Upload `mychart-0.1.0.tgz`:
```bash
curl --data-binary "@mychart-0.1.0.tgz" http://localhost:8080/api/charts
```

If you've signed your package and generated a [provenance file](https://github.com/helm/helm-www/blob/master/content/en/docs/topics/provenance.md), upload it with:
```bash
curl --data-binary "@mychart-0.1.0.tgz.prov" http://localhost:8080/api/prov
```

Both files can also be uploaded at once (or one at a time) on the `/api/charts` route using the `multipart/form-data` format:

```bash
curl -F "chart=@mychart-0.1.0.tgz" -F "prov=@mychart-0.1.0.tgz.prov" http://localhost:8080/api/charts
```

You can also use the [helm-push plugin](https://github.com/chartmuseum/helm-push):
```
helm cm-push mychart/ chartmuseum
```

### Installing Charts into Kubernetes
Add the URL to your *ChartMuseum* installation to the local repository list:
```bash
helm repo add chartmuseum http://localhost:8080
```

Search for charts:
```bash
helm search repo chartmuseum/
```

Install chart:
```bash
helm install chartmuseum/mychart --generate-name
```


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