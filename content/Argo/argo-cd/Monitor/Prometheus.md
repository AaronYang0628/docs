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
    targetRevision: 59.1.0
    helm:
      releaseName: prometheus-stack
      values: |
        crds:
          enabled: true
        global:
          rbac:
            create: true
        alertmanager:
          enabled: true
          ingress:
            enabled: false
          serviceMonitor:
            selfMonitor: true
          alertmanagerSpec:
            image:
              registry: m.daocloud.io/quay.io
            storage:
              volumeClaimTemplate:
                spec:
                  storageClassName: nfs-external
                  accessModes:
                  - ReadWriteOnce
                  resources:
                    requests:
                      storage: 20Gi
        grafana:
          enabled: true
          image:
            registry: m.daocloud.io/docker.io
          testFramework:
            enabled: true
            image:
              registry: m.daocloud.io/docker.io
          downloadDashboardsImage:
            registry: m.daocloud.io/docker.io
          serviceMonitor:
            enabled: true
          ingress:
            enabled: true
            annotations:
              cert-manager.io/clusterissuer: self-signed-issuer
            ingressClassName: nginx
            path: /
            pathtype: ImplementationSpecific
            hosts:
            - grafana.astronomy.zhejianglab.com
            tls:
            - secretName: grafana.astronomy.zhejianglab.com-tls
              hosts:
              - grafana.astronomy.zhejianglab.com
          persistence:
            enabled: true
            storageClassName: nfs-external
          initChownData:
            enabled: true
            image:
              registry: m.daocloud.io/docker.io
          admin:
            existingSecret: prometheus-stack-credentials
            userKey: grafana-username
            passwordKey: grafana-password
          datasources: {}
          dashboardProviders: {}
          dashboards: {}
          sidecar:
            image:
              registry: m.daocloud.io/quay.io
            dashboards:
              enabled: true
            datasources:
              enabled: true
          imageRenderer:
            enabled: false
            image:
              registry: m.daocloud.io/docker.io
        kubernetesServiceMonitors:
          enabled: true
          sidecar:
        kubeApiServer:
          enabled: true
        kubelet:
          enabled: true
          namespace: kube-system
        kubeControllerManager:
          enabled: true
          serviceMonitor:
            enabled: true
        coreDns:
          enabled: true
          serviceMonitor:
            enabled: true
        kubeDns:
          enabled: false
        kubeEtcd:
          enabled: true
          service:
            enabled: true
          serviceMonitor:
            enabled: true
        kubeScheduler:
          enabled: true
          service:
            enabled: true
          serviceMonitor:
            enabled: true
            insecureSkipVerify: true
        kubeProxy:
          enabled: true
          service:
            enabled: true
          serviceMonitor:
            enabled: true
        kubeStateMetrics:
          enabled: true
        kube-state-metrics:
          image:
            registry: m.daocloud.io/registry.k8s.io
          prometheus:
            monitor:
              enabled: true
          selfMonitor:
            enabled: false
        nodeExporter:
          enabled: true
        prometheus-node-exporter:
          image:
            registry: m.daocloud.io/quay.io
          prometheus:
            monitor:
              enabled: true
        prometheusOperator:
          enabled: true
          admissionWebhooks:
            enabled: true
            deployment:
              enabled: false
              image:
                registry: m.daocloud.io/quay.io
            patch:
              enabled: true
              image:
                registry: m.daocloud.io/registry.k8s.io
            certManager:
              enabled: false
          serviceAccount:
            create: true
          service:
            type: ClusterIP
          serviceMonitor:
            selfMonitor: true
        prometheus:
          enabled: true
          serviceAccount:
            create: true
          thanosService:
            enabled: false
          thanosServiceMonitor:
            enabled: false
          thanosServiceExternal:
            enabled: false
          service:
            type: ClusterIP
          servicePerReplica:
            enabled: false
          podDisruptionBudget:
            enabled: false
          thanosIngress:
            enabled: false
          ingress:
            enabled: true
            annotations:
              cert-manager.io/clusterissuer: self-signed-issuer
            ingressClassName: nginx
            paths:
            - /
            pathtype: ImplementationSpecific
            hosts:
            - prometheus.astronomy.zhejianglab.com
            tls:
            - secretName: prometheus.astronomy.zhejianglab.com-tls
              hosts:
              - prometheus.astronomy.zhejianglab.com
          serviceMonitor:
            selfMonitor: true
          prometheusSpec:
            image:
              registry: m.daocloud.io/quay.io
            storageSpec:
              volumeClaimTemplate:
                spec:
                  storageClassName: nfs-external
                  accessModes:
                  - ReadWriteOnce
                  resources:
                    requests:
                      storage: 20Gi
        thanosRuler:
          enabled: false
          ingress:
            enabled: false
          serviceMonitor:
            selfMonitor: true
          thanosRulerSpec:
            image:
              registry: m.daocloud.io/quay.io
          storage:
            volumeClaimTemplate:
              spec:
                storageClassName: nfs-external
                accessModes:
                - ReadWriteOnce
                resources:
                  requests:
                    storage: 20Gi
        windowsMonitoring:
          enabled: false
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
> add `$K8S_MASTER_IP grafana.astronomy.zhejianglab.com` to **/etc/hosts**

> add `$K8S_MASTER_IP prometheus.astronomy.zhejianglab.com` to **/etc/hosts**

prometheus-srver: [https://prometheus.astronomy.zhejianglab.com:32443/](https://prometheus.astronomy.zhejianglab.com:32443/)

grafana-console: [https://grafana.astronomy.zhejianglab.com:32443/](https://grafana.astronomy.zhejianglab.com:32443/)