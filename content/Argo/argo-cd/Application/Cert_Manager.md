+++
tags = ["Cert Manger"]
title = 'Install Cert Manger'
date = 2024-03-07T15:00:59+08:00
weight = 1
+++

### Preliminary
- Kubernetes has installed, if not check [link](kubernetes/command/install/index.html)
- argoCD has installed, if not check [link](argo/argo-cd/argocd/index.html)

### Steps
#### 1. prepare `cert-manager.yaml`
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: cert-manager
spec:
  syncPolicy:
    syncOptions:
    - CreateNamespace=true
  project: default
  source:
    repoURL: https://aaronyang0628.github.io/helm-chart-mirror/charts
    chart: cert-manager
    targetRevision: 1.17.2
    helm:
      releaseName: cert-manager
      values: |
        installCRDs: true
        image:
          repository: m.daocloud.io/quay.io/jetstack/cert-manager-controller
          tag: v1.17.2
        webhook:
          image:
            repository: m.daocloud.io/quay.io/jetstack/cert-manager-webhook
            tag: v1.17.2
        cainjector:
          image:
            repository: m.daocloud.io/quay.io/jetstack/cert-manager-cainjector
            tag: v1.17.2
        acmesolver:
          image:
            repository: m.daocloud.io/quay.io/jetstack/cert-manager-acmesolver
            tag: v1.17.2
        startupapicheck:
          image:
            repository: m.daocloud.io/quay.io/jetstack/cert-manager-startupapicheck
            tag: v1.17.2
  destination:
    server: https://kubernetes.default.svc
    namespace: basic-components
```

#### 2. apply to k8s
```shell
kubectl -n argocd apply -f cert-manager.yaml
```

#### 3. sync by argocd
```shell
argocd app sync argocd/cert-manager
```

#### 4. prepare `self-signed.yaml`
```yaml
---
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  namespace: basic-components
  name: self-signed-issuer
spec:
  selfSigned: {}

---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  namespace: basic-components
  name: my-self-signed-ca
spec:
  isCA: true
  commonName: my-self-signed-ca
  secretName: root-secret
  privateKey:
    algorithm: ECDSA
    size: 256
  issuerRef:
    name: self-signed-issuer
    kind: Issuer
    group: cert-manager.io
---
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: self-signed-ca-issuer
spec:
  ca:
    secretName: root-secret
```

#### 5. apply to k8s
```shell
kubectl apply -f self-signed.yaml
```