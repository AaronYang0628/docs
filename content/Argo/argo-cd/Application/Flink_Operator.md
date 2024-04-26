+++
tags = ["Flink"]
title = 'Install Flink K8S Operator'
date = 2024-04-07T15:00:59+08:00
weight = 10
+++

### Preliminary
- Kubernetes has installed, if not check [link](kubernetes/command/install/index.html)
- argoCD has installed, if not check [link](argo/argo-cd/argocd/index.html)
- cert-manager has installed on argocd and the clusterissuer has a named `self-signed-ca-issuer`service, , if not check [link](argo/argo-cd/application/cert_manager/index.html)

### Steps
#### 1. prepare `flink-operator.yaml`
```yaml
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
```

#### 2. apply to k8s
```shell
kubectl -n argocd apply -f flink-operator.yaml
```

#### 3. sync by argocd
```shell
argocd app sync argocd/flink-operator
```
