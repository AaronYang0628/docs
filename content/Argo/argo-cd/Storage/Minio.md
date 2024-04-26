+++
tags = ["Minio"]
title = 'Install Minio'
date = 2024-03-07T15:00:59+08:00
weight = 20
+++

### Preliminary
- Kubernetes has installed, if not check [link](kubernetes/command/install/index.html)
- argoCD has installed, if not check [link](argo/argo-cd/argocd/index.html)
- ingres has installed on argoCD, if not [check link](argo/argo-cd/application/ingress/index.html)
- cert-manager has installed on argocd and the clusterissuer has a named `self-signed-ca-issuer`service, , if not check [link](argo/argo-cd/application/cert_manager/index.html)

### Steps
#### 1. prepare secret 
```shell
kubectl get namespaces storage > /dev/null 2>&1 || kubectl create namespace storage
kubectl -n storage create secret generic minio-secret \
    --from-literal=rootUser=admin \
    --from-literal=rootPassword=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16)
```
#### 2. prepare `minio.yaml`
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: minio
spec:
  syncPolicy:
    syncOptions:
    - CreateNamespace=true
  project: default
  source:
    repoURL: https://ben-wangz.github.io/helm-chart-mirror/charts
    chart: minio
    targetRevision: 5.0.15
    helm:
      releaseName: minio
      values: |
        image:
          repository: m.daocloud.io/quay.io/minio/minio
        mcImage:
          repository: m.daocloud.io/quay.io/minio/mc
        mode: standalone
        persistence:
          enabled: false
        ingress:
          enabled: true
          ingressClassName: nginx
          annotations:
            nginx.ingress.kubernetes.io/rewrite-target: /$1
          path: /?(.*)
          hosts:
            - minio-api.dev.geekcity.tech
        consoleIngress:
          enabled: true
          ingressClassName: nginx
          annotations:
            nginx.ingress.kubernetes.io/rewrite-target: /$1
          path: /?(.*)
          hosts:
            - minio-console.dev.geekcity.tech
        replicas: 1
        resources:
          requests:
            memory: 512Mi
            cpu: 250m
          limits:
            memory: 512Mi
            cpu: 250m
        existingSecret: minio-secret
  destination:
    server: https://kubernetes.default.svc
    namespace: storage
```

#### 3. apply to k8s
```shell
kubectl -n argocd apply -f minio.yaml
```

#### 4. sync by argocd
```shell
argocd app sync argocd/minio
```

#### 5. visit web console
`minio-console.dev.geekcity.tech` should be resolved to nginx-ingress
for example, add `$K8S_MASTER_IP minio-console.dev.geekcity.tech` to `/etc/hosts`
address: http://minio-console.dev.geekcity.tech:32080/login
access key: admin
access secret could get from
```shell
kubectl -n storage get secret minio-secret -o jsonpath='{.data.rootPassword}' | base64 -d
```
