+++
tags = ["Reids"]
title = 'Install Reids'
date = 2024-05-07T15:00:59+08:00
weight = 180
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
kubectl -n storage create secret generic redis-credentials \
    --from-literal=redis-password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16)
```
#### 2. prepare `redis.yaml`
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: redis
spec:
  syncPolicy:
    syncOptions:
    - CreateNamespace=true
  project: default
  source:
    repoURL: https://charts.bitnami.com/bitnami
    chart: redis
    targetRevision: 18.16.0
    helm:
      releaseName: redis
      values: |
        architecture: replication
        auth:
          enabled: true
          sentinel: true
          existingSecret: redis-credentials
        master:
          count: 1
          disableCommands:
            - FLUSHDB
            - FLUSHALL
          persistence:
            enabled: true
            storageClass: nfs-external
            size: 8Gi
        replica:
          replicaCount: 3
          disableCommands:
            - FLUSHDB
            - FLUSHALL
          persistence:
            enabled: true
            storageClass: nfs-external
            size: 8Gi
        image:
          registry: m.daocloud.io/docker.io
          pullPolicy: IfNotPresent
        sentinel:
          enabled: false
          persistence:
            enabled: false
          image:
            registry: m.daocloud.io/docker.io
            pullPolicy: IfNotPresent
        metrics:
          enabled: false
          image:
            registry: m.daocloud.io/docker.io
            pullPolicy: IfNotPresent
        volumePermissions:
          enabled: false
          image:
            registry: m.daocloud.io/docker.io
            pullPolicy: IfNotPresent
        sysctl:
          enabled: false
          image:
            registry: m.daocloud.io/docker.io
            pullPolicy: IfNotPresent
        extraDeploy:
          - |
            apiVersion: apps/v1
            kind: Deployment
            metadata:
              name: redis-tool
              namespace: csst
              labels:
                app.kubernetes.io/name: redis-tool
            spec:
              replicas: 1
              selector:
                matchLabels:
                  app.kubernetes.io/name: redis-tool
              template:
                metadata:
                  labels:
                    app.kubernetes.io/name: redis-tool
                spec:
                  containers:
                  - name: redis-tool
                    image: m.daocloud.io/docker.io/bitnami/redis:7.2.4-debian-12-r8
                    imagePullPolicy: IfNotPresent
                    env:
                    - name: REDISCLI_AUTH
                      valueFrom:
                        secretKeyRef:
                          key: redis-password
                          name: redis-credentials
                    - name: TZ
                      value: Asia/Shanghai
                    command:
                    - tail
                    - -f
                    - /etc/hosts
  destination:
    server: https://kubernetes.default.svc
    namespace: storage
```

#### 3. apply to k8s
```shell
kubectl -n argocd apply -f redis.yaml
```

#### 4. sync by argocd
```shell
argocd app sync argocd/redis
```

#### 5. decode password
```shell
kubectl -n storage get secret redis-credentials -o jsonpath='{.data.redis-password}' | base64 -d
```

## tests

* ```shell
  kubectl -n storage exec -it deployment/redis-tool -- \
      redis-cli -c -h redis-master.storage ping
  ```
* ```shell
  kubectl -n storage exec -it deployment/redis-tool -- \
      redis-cli -c -h redis-master.storage set mykey somevalue
  ```
* ```shell
  kubectl -n storage exec -it deployment/redis-tool -- \
      redis-cli -c -h redis-master.storage get mykey
  ```
* ```shell
  kubectl -n storage exec -it deployment/redis-tool -- \
      redis-cli -c -h redis-master.storage del mykey
  ```
* ```shell
  kubectl -n storage exec -it deployment/redis-tool -- \
      redis-cli -c -h redis-master.storage get mykey
  ```
