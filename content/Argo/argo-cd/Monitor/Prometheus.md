+++
tags = ["Permetheus"]
title = 'Install Permetheus'
date = 2024-06-07T15:00:59+08:00
weight = 1
+++

### Preliminary
- Kubernetes has installed, if not check [link](kubernetes/command/install/index.html)
- argoCD has installed, if not check [link](argo/argo-cd/argocd/index.html)
- ingres has installed on argoCD, if not [check link](argo/argo-cd/application/ingress/index.html)
- cert-manager has installed on argocd and the clusterissuer has a named `self-signed-ca-issuer`service, , if not check [link](argo/argo-cd/application/cert_manager/index.html)

### Steps

#### 0. prepare helm chart
```shell
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
```

#### 1. prepare secret 
```shell
kubectl get namespaces monitor > /dev/null 2>&1 || kubectl create namespace monitor
 kubectl -n monitor create secret generic prometheus-stack-credentials \
 --from-literal=grafana-username=admin \
 --from-literal=grafana-password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16)
```
#### 2. prepare `prometheus-stack.yaml`
```yaml
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
    repoURL: https://prometheus-community.github.io/helm-charts
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
```

#### 3. apply to k8s
```shell
kubectl -n argocd apply -f prometheus-stack.yaml
```

#### 4. sync by argocd
```shell
argocd app sync argocd/prometheus-stack
```

#### 7. [[OPTIONAL]]() extract clickhouse admin credentials 
```shell
kubectl -n monitor get secret prometheus-stack-credentials -o jsonpath='{.data.grafana-password}' | base64 -d
```

#### 8. [[OPTIONAL]]() check web dashboard
> add `$K8S_MASTER_IP grafana.dev.tech` to **/etc/hosts**

> add `$K8S_MASTER_IP prometheus.dev.tech` to **/etc/hosts**

prometheus-srver: [https://prometheus.dev.tech:32443/](https://prometheus.dev.tech:32443/)

grafana-console: [https://grafana.dev.tech:32443/](https://grafana.dev.tech:32443/)