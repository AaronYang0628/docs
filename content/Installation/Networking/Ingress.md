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

  <p> <b>1.get helm repo </b></p>

  {{% notice style="transparent" %}}
  ```bash
  helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
  helm repo update
  ```
  {{% /notice %}}

  <p> <b>2.install chart </b></p>

  {{% notice style="transparent" %}}
  ```bash
  helm install ingress-nginx/ingress-nginx --generate-name
  ```
  {{% /notice %}}

  {{% notice style="important" title="Using Mirror" %}} 
  ```shell
  helm repo add ay-helm-mirror https://aaronyang0628.github.io/helm-chart-mirror/charts &&
    helm install ay-helm-mirror/ingress-nginx --generate-name --version 4.11.3
  ```
  for more information, you can check 🔗[https://aaronyang0628.github.io/helm-chart-mirror/](https://aaronyang0628.github.io/helm-chart-mirror/)
  {{% /notice %}}

{{< /tab >}}

{{< tab title="ArgoCD" style="transparent">}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  2. argoCD has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>

  <p> <b>1.prepare</b> `ingress-nginx.yaml` </p>

  {{% notice style="transparent" %}}
  ```yaml
  kubectl -n argocd apply -f - <<EOF
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
      repoURL: https://kubernetes.github.io/ingress-nginx
      chart: ingress-nginx
      targetRevision: 4.12.3
      helm:
        releaseName: ingress-nginx
        values: |
          controller:
            image:
              registry: m.daocloud.io/registry.k8s.io
            service:
              enabled: true
              type: NodePort
              nodePorts:
                http: 32080
                https: 32443
                tcp:
                  8080: 32808
            resources:
              requests:
                cpu: 100m
                memory: 128Mi
            admissionWebhooks:
              enabled: true
              patch:
                enabled: true
                image:
                  registry: m.daocloud.io/registry.k8s.io
          metrics:
            enabled: false
          defaultBackend:
            enabled: false
            image:
              registry: m.daocloud.io/registry.k8s.io
    destination:
      server: https://kubernetes.default.svc
      namespace: basic-components
  EOF
  ```
  {{% /notice %}}


  <p> <b><a>[Optional]</a> 2.apply to k8s</b></p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl -n argocd apply -f ingress-nginx.yaml
  ```
 {{% /notice %}}

  <p> <b>3.sync by argocd</b></p>
  {{% notice style="transparent" %}}
  ```bash
  argocd app sync argocd/ingress-nginx
  ```
 {{% /notice %}}

{{< /tab >}}



{{< /tabs >}}



### FAQ

{{% expand title="Q1: Using minikube, cannot access to the website" %}}


```plaintext
ssh -i ~/.minikube/machines/minikube/id_rsa docker@$(minikube ip) -L '*:30443:0.0.0.0:30443' -N -f
ssh -i ~/.minikube/machines/minikube/id_rsa docker@$(minikube ip) -L '*:32443:0.0.0.0:32443' -N -f
ssh -i ~/.minikube/machines/minikube/id_rsa docker@$(minikube ip) -L '*:32080:0.0.0.0:32080' -N -f
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