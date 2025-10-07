+++
tags = ["Permetheus"]
title = 'Install Permetheus Stack'
date = 2024-06-07T15:00:59+08:00
weight = 160
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

  {{% notice style="important" title="Using Mirror" %}} 
  ```shell
  helm repo add ay-helm-mirror https://aaronyang0628.github.io/helm-chart-mirror/charts \
    && helm install ay-helm-mirror/kube-prometheus-stack  --generate-name --version 1.17.2
  ```
  for more information, you can check 🔗[https://aaronyang0628.github.io/helm-chart-mirror/](https://aaronyang0628.github.io/helm-chart-mirror/)
  {{% /notice %}}

{{< /tab >}}

{{< tab title="ArgoCD" style="transparent">}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/kubernetes/cluster/index.html" target="_blank">link</a> </p></br>
  2. ArgoCD has installed, if not check 🔗<a href="/docs/software/cicd/argocd/index.html" target="_blank">link</a> </p></br>
  3. Helm binary has installed, if not check 🔗<a href="/docs/software/binary/helm/index.html" target="_blank">link</a> </p></br>
  4. Ingres has installed on argoCD, if not check 🔗<a href="/docs/software/networking/ingress/index.html" target="_blank">link</a> </p></br>

  <p> <b>1.prepare</b> `chart-museum-credentials` </p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl get namespaces monitor > /dev/null 2>&1 || kubectl create namespace monitor
  kubectl -n monitor create secret generic prometheus-stack-credentials \
    --from-literal=grafana-username=admin \
    --from-literal=grafana-password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16)
  ```
  {{% /notice %}}

  <p> <b>2.prepare</b> `prometheus-stack.yaml` </p>

  {{% notice style="transparent" %}}
  ```yaml
  kubectl -n argocd apply -f - << EOF
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
        targetRevision: 72.9.1
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
  EOF
  ```
  {{% /notice %}}

  <p> <b>3.sync by argocd</b></p>

  {{% notice style="transparent" %}}
  ```bash
  argocd app sync argocd/prometheus-stack
  ```
  {{% /notice %}}


  <p> <b>4.extract clickhouse admin credentials</b></p>

  {{% notice style="transparent" %}}
  ```bash
    kubectl -n monitor get secret prometheus-stack-credentials -o jsonpath='{.data.grafana-password}' | base64 -d
  ```
  {{% /notice %}}


  <p> <b>5.check the web browser</b></p>

  {{% notice style="transparent" %}}
  ```bash
    > add `$K8S_MASTER_IP grafana.dev.tech` to **/etc/hosts**

    > add `$K8S_MASTER_IP prometheus.dev.tech` to **/etc/hosts**
  ```
  {{% /notice %}}
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