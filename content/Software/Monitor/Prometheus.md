+++
tags = ["Permetheus"]
title = 'Install Permetheus Stack'
date = 2024-06-07T15:00:59+08:00
weight = 1
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
    {{% tab title="2.prepare `prometheus-stack.yaml`" %}}
    apiVersion: argoproj.io/v1alpha1
    kind: Application
    metadata:
      name: prometheus-stack
    spec:
      syncPolicy:
        syncOptions:
          - CreateNamespace=true
          - ServerSideApply=true
      project: default
      source:
        repoURL: https://aaronyang0628.github.io/helm-chart-mirror/charts
        chart: kube-prometheus-stack
        targetRevision: 72.6.2
        helm:
          releaseName: prometheus-stack
          values: |
            crds:
              enabled: true
            global:
              rbac:
                create: true
              imageRegistry: ""
              imagePullSecrets: []
            alertmanager:
              enabled: true
              ingress:
                enabled: false
              serviceMonitor:
                selfMonitor: true
                interval: ""
              alertmanagerSpec:
                image:
                  registry: m.daocloud.io/quay.io
                  repository: prometheus/alertmanager
                  tag: v0.28.1
                replicas: 1
                resources: {}
                storage:
                  volumeClaimTemplate:
                    spec:
                      storageClassName: ""
                      accessModes: ["ReadWriteOnce"]
                      resources:
                        requests:
                          storage: 2Gi
            grafana:
              enabled: true
              ingress:
                enabled: true
                annotations:
                  cert-manager.io/clusterissuer: self-signed-issuer
                  kubernetes.io/ingress.class: nginx
                hosts:
                  - grafana.dev.tech
                path: /
                pathtype: ImplementationSpecific
                tls:
                - secretName: grafana.dev.tech-tls
                  hosts:
                  - grafana.dev.tech
            prometheusOperator:
              admissionWebhooks:
                patch:
                  resources: {}
                  image:
                    registry: m.daocloud.io/registry.k8s.io
                    repository: ingress-nginx/kube-webhook-certgen
                    tag: v1.5.3  
              image:
                registry: m.daocloud.io/quay.io
                repository: prometheus-operator/prometheus-operator
              prometheusConfigReloader:
                image:
                  registry: m.daocloud.io/quay.io
                  repository: prometheus-operator/prometheus-config-reloader
                resources: {}
              thanosImage:
                registry: m.daocloud.io/quay.io
                repository: thanos/thanos
                tag: v0.38.0
            prometheus:
              enabled: true
              ingress:
                enabled: true
                annotations:
                  cert-manager.io/clusterissuer: self-signed-issuer
                  kubernetes.io/ingress.class: nginx
                hosts:
                  - prometheus.dev.tech
                path: /
                pathtype: ImplementationSpecific
                tls:
                - secretName: prometheus.dev.tech-tls
                  hosts:
                  - prometheus.dev.tech
              prometheusSpec:
                image:
                  registry: m.daocloud.io/quay.io
                  repository: prometheus/prometheus
                  tag: v3.4.0
                replicas: 1
                shards: 1
                resources: {}
                storageSpec: 
                  volumeClaimTemplate:
                    spec:
                      storageClassName: ""
                      accessModes: ["ReadWriteOnce"]
                      resources:
                        requests:
                          storage: 2Gi
            thanosRuler:
              enabled: false
              ingress:
                enabled: false
              thanosRulerSpec:
                replicas: 1
                storage: {}
                resources: {}
                image:
                  registry: m.daocloud.io/quay.io
                  repository: thanos/thanos
                  tag: v0.38.0
      destination:
        server: https://kubernetes.default.svc
        namespace: monitor
    {{% /tab %}}
  {{< /tabs >}}


  {{< tabs groupid="3333" >}}
    {{% tab title="3.apply to k8s " %}}
  ```bash
    kubectl -n argocd apply -f prometheus-stack.yaml
  ```
    {{% /tab %}}
  {{< /tabs >}}



  {{< tabs groupid="4444" >}}
    {{% tab title="4.sync by argocd" %}}
  ```bash
    argocd app sync argocd/prometheus-stack
  ```
    {{% /tab %}}
  {{< /tabs >}}

  {{< tabs groupid="5555" >}}
    {{% tab title="5.extract clickhouse admin credentials " %}}
  ```bash
    kubectl -n monitor get secret prometheus-stack-credentials -o jsonpath='{.data.grafana-password}' | base64 -d
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