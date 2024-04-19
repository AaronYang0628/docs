+++
title = '安装Argo WorkFlow'
date = 2024-03-07T15:00:59+08:00
weight = 1
+++

### Preliminary
- Kubernets has installed
- Argo CD has installed
- cert-manager has installed on argocd and the clusterissuer has a named `self-signed-ca-issuer`service

### 1. prepare `argo-workflows.yaml`

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: argo-workflows
spec:
  syncPolicy:
    syncOptions:
    - CreateNamespace=true
  project: default
  source:
    repoURL: https://argoproj.github.io/argo-helm
    chart: argo-workflows
    targetRevision: 0.40.11
    helm:
      releaseName: argo-workflows
      values: |
        crds:
          install: true
          keep: false
        singleNamespace: false
        controller:
          image:
            registry: m.daocloud.io/quay.io
          workflowNamespaces:
            - business-workflows
        executor:
          image:
            registry: m.daocloud.io/quay.io
        workflow:
          serviceAccount:
            create: true
          rbac:
            create: true
        server:
          enabled: true
          image:
            registry: m.daocloud.io/quay.io
          ingress:
            enabled: true
            ingressClassName: nginx
            annotations:
              cert-manager.io/cluster-issuer: self-signed-ca-issuer
              nginx.ingress.kubernetes.io/rewrite-target: /$1
            hosts:
              - argo-workflows.dev.geekcity.tech
            paths:
              - /?(.*)
            tls:
              - secretName: argo-workflows-tls
                hosts:
                  - argo-workflows.dev.geekcity.tech
          authModes:
            - server
          sso:
            enabled: false
  destination:
    server: https://kubernetes.default.svc
    namespace: workflows
```

### 2. install argo workflow binary

```shell
MIRROR="files.m.daocloud.io/"
VERSION=v3.5.4
curl -sSLo argo-linux-amd64.gz "https://${MIRROR}github.com/argoproj/argo-workflows/releases/download/${VERSION}/argo-linux-amd64.gz"
gunzip argo-linux-amd64.gz
chmod u+x argo-linux-amd64
mkdir -p ${HOME}/bin
mv -f argo-linux-amd64 ${HOME}/bin/argo-wf
rm -f argo-linux-amd64.gz

```

### 3. create workflow related namespace
```yaml
kubectl get namespace business-workflows > /dev/null 2>&1 || kubectl create namespace business-workflows
```


### 4. apply to k8s
```shell
kubectl -n argocd apply -f argo-workflows.yaml
```

### 5. sync by argocd
```shell
argocd app sync argocd/argo-workflows
```
