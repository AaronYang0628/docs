+++
tags = ["Ingress"]
title = 'Install Ingress'
date = 2024-03-07T15:00:59+08:00
weight = 2
+++

### Preliminary
- Kubernetes has installed, if not check [link](kubernetes/command/install/index.html)
- argoCD has installed, if not check [link](argo/argo-cd/argocd/index.html)

### Steps
#### 1. prepare `ingress-nginx.yaml`
```yaml
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
```

#### 2. apply to k8s
```shell
kubectl -n argocd apply -f ingress-nginx.yaml
```

#### 3. sync by argocd
```shell
argocd app sync argocd/ingress-nginx
```
