+++
tags = ["Clickhouse"]
title = 'Install Clickhouse'
date = 2024-03-07T15:00:59+08:00
weight = 30
+++

### Preliminary
- Kubernetes has installed, if not check [link](kubernetes/command/install/index.html)
- argoCD has installed, if not check [link](argo/argo-cd/argocd/index.html)
- cert-manager has installed on argocd and the clusterissuer has a named `self-signed-ca-issuer`service, , if not check [link](argo/argo-cd/application/cert_manager/index.html)

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
        serviceAccount:
          name: clickhouse
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
            enabled: true
            storageClass: nfs-external
            size: 8Gi
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
        resources:
          requests:
            cpu: 2
            memory: 512Mi
          limits:
            cpu: 3
            memory: 1024Mi
        auth:
          username: admin
          existingSecret: clickhouse-admin-credentials
          existingSecretKey: password
        metrics:
          enabled: true
          image:
            registry: m.daocloud.io/docker.io
            pullPolicy: IfNotPresent
          serviceMonitor:
            enabled: true
            namespace: monitor
            jobLabel: clickhouse
            selector:
              app.kubernetes.io/name: clickhouse
              app.kubernetes.io/instance: clickhouse
            labels:
              release: prometheus-stack
        extraDeploy:
          - |
            apiVersion: apps/v1
            kind: Deployment
            metadata:
              name: clickhouse-tool
              namespace: database
              labels:
                app.kubernetes.io/name: clickhouse-tool
            spec:
              replicas: 1
              selector:
                matchLabels:
                  app.kubernetes.io/name: clickhouse-tool
              template:
                metadata:
                  labels:
                    app.kubernetes.io/name: clickhouse-tool
                spec:
                  containers:
                    - name: clickhouse-tool
                      image: m.daocloud.io/docker.io/clickhouse/clickhouse-server:23.11.5.29-alpine
                      imagePullPolicy: IfNotPresent
                      env:
                        - name: CLICKHOUSE_USER
                          value: admin
                        - name: CLICKHOUSE_PASSWORD
                          valueFrom:
                            secretKeyRef:
                              key: password
                              name: clickhouse-admin-credentials
                        - name: CLICKHOUSE_HOST
                          value: csst-clickhouse.csst
                        - name: CLICKHOUSE_PORT
                          value: "9000"
                        - name: TZ
                          value: Asia/Shanghai
                      command:
                        - tail
                      args:
                        - -f
                        - /etc/hosts
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
kubectl -n database get secret clickhouse-admin-credentials -o jsonpath='{.data.password}' | base64 -d
```

#### 8. [[OPTIONAL]]() invoke http api
> add `$K8S_MASTER_IP clickhouse.dev.geekcity.tech` to **/etc/hosts**
```shell
CK_PASS=$(kubectl -n database get secret clickhouse-admin-credentials -o jsonpath='{.data.password}' | base64 -d)
echo 'SELECT version()' | curl -k "https://admin:${CK_PASS}@clickhouse.dev.geekcity.tech:32443/" --data-binary @-
```