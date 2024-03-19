+++
tags = ["Clickhouse"]
title = 'Install Clickhouse'
date = 2024-03-07T15:00:59+08:00
+++

### Preliminary
- Kubernetes has installed, if not check [link](kubernetes/command/install/index.html)
- argoCD has installed, if not check [link](kubernetes/argo/argo-cd/argocd/index.html)
- cert-manager has installed on argocd and the clusterissuer has a named `self-signed-ca-issuer`service, , if not check [link](kubernetes/command/install/index.html)

### Steps
#### 1. prepare `clickhouse.yaml`
This app will created under `database` namespace
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: clickhouse
spec:
  syncPolicy:
    syncOptions:
    - CreateNamespace=true
  project: default
  source:
    repoURL: https://charts.bitnami.com/bitnami
    chart: clickhouse
    targetRevision: 4.5.1
    helm:
      releaseName: clickhouse
      values: |
        image:
          registry: m.daocloud.io/docker.io
          pullPolicy: IfNotPresent
        volumePermissions:
          enabled: false
          image:
            registry: m.daocloud.io/docker.io
            pullPolicy: IfNotPresent
        zookeeper:
          enabled: true
          image:
            registry: m.daocloud.io/docker.io
            pullPolicy: IfNotPresent
          replicaCount: 3
          persistence:
            enabled: false
          volumePermissions:
            enabled: false
            image:
              registry: m.daocloud.io/docker.io
              pullPolicy: IfNotPresent
        shards: 2
        replicaCount: 3
        ingress:
          enabled: true
          annotations:
            cert-manager.io/cluster-issuer: self-signed-ca-issuer
            nginx.ingress.kubernetes.io/rewrite-target: /$1
          hostname: clickhouse.dev.geekcity.tech
          ingressClassName: nginx
          path: /?(.*)
          tls: true
        persistence:
          enabled: false
        auth:
          username: admin
          existingSecret: clickhouse-admin-credentials
          existingSecretKey: password
  destination:
    server: https://kubernetes.default.svc
    namespace: database
```

{{% expand title="if you wannna add persistence"%}}
```yaml
persistence:
  storageClass: "alicloud-disk-topology-alltype"
  accessModes:
    - ReadWriteMany
  size: 20Gi
```
{{% /expand %}}

#### 2. prepare admin credentials secret
secrect will created under `database` namespace.
```shell
kubectl get namespaces database > /dev/null 2>&1 || kubectl create namespace database
kubectl -n database create secret generic clickhouse-admin-credentials \
    --from-literal=password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16)
```

#### 3. apply to k8s
```shell
kubectl -n argocd apply -f clickhouse.yaml
```

#### 4. sync by argocd
```shell
argocd app sync argocd/clickhouse
```


---

#### 5. [[OPTIONAL]]() prepare `clickhouse-interface.yaml`
```yaml
apiVersion: v1
kind: Service
metadata:
  labels:
    app.kubernetes.io/component: clickhouse
    app.kubernetes.io/instance: clickhouse
  name: clickhouse-interface
spec:
  ports:
  - name: tcp-clickhouse
    port: 9005
    protocol: TCP
    targetPort: tcp-clickhouse
    nodePort: 32005
  selector:
    app.kubernetes.io/component: clickhouse
    app.kubernetes.io/instance: clickhouse
    app.kubernetes.io/name: clickhouse
  type: NodePort
```

#### 6. [[OPTIONAL]]() apply to k8s
```shell
kubectl -n database apply -f clickhouse-interface.yaml
```

#### 7. [[OPTIONAL]]() extract clickhouse admin credentials 
```shell
PASSWORD=$(kubectl -n database get secret clickhouse-admin-credentials -o jsonpath='{.data.password}' | base64 -d)
```

#### 8. [[OPTIONAL]]() invoke http api
> add `$K8S_MASTER_IP clickhouse.dev.geekcity.tech` to **/etc/hosts**
```shell
echo 'SELECT version()' | curl -k "https://admin:${PASSWORD}@clickhouse.dev.geekcity.tech:32443/" --data-binary @-
```