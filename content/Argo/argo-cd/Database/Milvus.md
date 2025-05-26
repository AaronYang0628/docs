+++
title = 'Install Milvus'
date = 2025-05-26T01:00:59+08:00
weight = 7
+++

### Preliminary
- Kubernetes has installed, if not check [link](kubernetes/command/install/index.html)
- argoCD has installed, if not check [link](argo/argo-cd/install_argocd/index.html)
- cert-manager has installed on argocd and the clusterissuer has a named `self-signed-ca-issuer`service, , if not check [link](argo/argo-cd/application/cert_manager/index.html)
- minio has installed, if not check [link](argo/argo-cd/storage/minio/index.html)

### Steps
#### 1. prepare mariadb credentials secret
```shell
kubectl get namespaces database > /dev/null 2>&1 || kubectl create namespace database
kubectl -n database create secret generic mariadb-credentials \
    --from-literal=mariadb-root-password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16) \
    --from-literal=mariadb-replication-password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16) \
    --from-literal=mariadb-password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16)
```

#### 2. prepare `deploy-mariadb.yaml`
```yaml
a---
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: milvus
spec:
  syncPolicy:
    syncOptions:
      - CreateNamespace=true
  project: default
  source:
    repoURL: registry-1.docker.io/bitnamicharts
    chart: milvus
    targetRevision: 11.2.4
    helm:
      releaseName: milvus
      values: |
        global:
          security:
            allowInsecureImages: true
        milvus:
          image:
            registry: m.lab.zverse.space/docker.io
            repository: bitnami/milvus
            tag: 2.5.7-debian-12-r0
            pullPolicy: IfNotPresent
          auth:
            enabled: false
        initJob:
          forceRun: false
          image:
            registry: m.lab.zverse.space/docker.io
            repository: bitnami/pymilvus
            tag: 2.5.6-debian-12-r0
            pullPolicy: IfNotPresent
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              cpu: 1000m
              memory: 2Gi
        dataCoord:
          replicaCount: 1
          resources:
            requests:
              cpu: 1
              memory: 1Gi
            limits:
              cpu: 2
              memory: 4Gi
        rootCoord:
          replicaCount: 1
          resources:
            requests:
              cpu: 1
              memory: 1Gi
            limits:
              cpu: 2
              memory: 4Gi
        queryCoord:
          replicaCount: 1
          resources:
            requests:
              cpu: 1
              memory: 1Gi
            limits:
              cpu: 2
              memory: 4Gi
        indexCoord:
          replicaCount: 1
          resources:
            requests:
              cpu: 1
              memory: 1Gi
            limits:
              cpu: 2
              memory: 4Gi
        dataNode:
          replicaCount: 1
          resources:
            requests:
              cpu: 1
              memory: 1Gi
            limits:
              cpu: 2
              memory: 4Gi
        queryNode:
          replicaCount: 1
          resources:
            requests:
              cpu: 1
              memory: 1Gi
            limits:
              cpu: 8
              memory: 30Gi
        indexNode:
          resources:
            requests:
              cpu: 1
              memory: 1Gi
            limits:
              cpu: 2
              memory: 4Gi
        proxy:
          replicaCount: 1
          service:
            type: ClusterIP
          resources:
            requests:
              cpu: 1
              memory: 1Gi
            limits:
              cpu: 2
              memory: 4Gi
        attu:
          image:
            registry: m.lab.zverse.space/docker.io
            repository: bitnami/attu
            tag: 2.5.5-debian-12-r1
          resources:
            requests:
              cpu: 1
              memory: 1Gi
            limits:
              cpu: 2
              memory: 4Gi
          service:
            type: ClusterIP
          ingress:
            enabled: true
            ingressClassName: "nginx"
            annotations:
              cert-manager.io/cluster-issuer: alidns-webhook-zverse-letsencrypt
            hostname: milvus.dev.tech
            path: /
            pathType: ImplementationSpecific
            tls: true
        waitContainer:
          image:
            registry: m.lab.zverse.space/docker.io
            repository: bitnami/os-shell
            tag: 12-debian-12-r40
            pullPolicy: IfNotPresent
          resources:
            requests:
              cpu: 1
              memory: 1Gi
            limits:
              cpu: 2
              memory: 4Gi
        externalS3:
          host: "minio-api.dev.tech"
          port: 32080
          existingSecret: "milvus-minio-credentials"
          existingSecretAccessKeyIDKey: "username"
          existingSecretKeySecretKey: "password"
          bucket: "milvus"
          rootPath: "file"
        etcd:
          enabled: true
          image:
            registry: m.lab.zverse.space/docker.io
          replicaCount: 3
          auth:
            rbac:
              create: false
            client:
              secureTransport: false
          resources:
            requests:
              cpu: 1
              memory: 2Gi
            limits:
              cpu: 2
              memory: 4Gi
          persistence:
            enabled: true
            storageClass: ""
            size: 100Gi
          preUpgradeJob:
            enabled: false
        minio:
          enabled: false
        kafka:
          enabled: true
          image:
            registry: m.lab.zverse.space/docker.io
          heapOpts: -Xmx32768m -Xms10240m
          controller:
            replicaCount: 3
            livenessProbe:
              failureThreshold: 8
            resources:
              requests:
                cpu: 8
                memory: 16Gi
              limits:
                cpu: 16
                memory: 20Gi
            persistence:
              enabled: true
              storageClass: ""
              size: 300Gi
          service:
            ports:
              client: 9092
          extraConfig: |-
            offsets.topic.replication.factor=3
          listeners:
            client:
              protocol: PLAINTEXT
            interbroker:
              protocol: PLAINTEXT
            external:
              protocol: PLAINTEXT
          sasl:
            enabledMechanisms: "PLAIN"
            client:
              users:
                - user
          broker:
            replicaCount: 0
  destination:
    server: https://kubernetes.default.svc
    namespace: database
```


#### 3. apply to k8s
```shell
kubectl -n argocd apply -f deploy-milvus.yaml
```

#### 4. sync by argocd
```shell
argocd app sync argocd/milvus
```


#### 5. [[Optional]]() import data
import data by using sql file
```shell
MARIADB_ROOT_PASSWORD=$(kubectl -n database get secret mariadb-credentials -o jsonpath='{.data.mariadb-root-password}' | base64 -d)
POD_NAME=$(kubectl get pod -n database -l "app.kubernetes.io/name=mariadb-tool" -o jsonpath="{.items[0].metadata.name}") \
&& export SQL_FILENAME="Dump20240301.sql" \
&& kubectl -n database cp ${SQL_FILENAME} ${POD_NAME}:/tmp/${SQL_FILENAME} \
&& kubectl -n database exec -it deployment/app-mariadb-tool -- bash -c \
    'echo "create database ccds;" | mysql -h mariadb.database -uroot -p$MARIADB_ROOT_PASSWORD' \
&& kubectl -n database exec -it ${POD_NAME} -- bash -c \
    "mysql -h mariadb.database -uroot -p\${MARIADB_ROOT_PASSWORD} \
    ccds < /tmp/Dump20240301.sql"
```

#### 6. [[Optional]]() decode password
```shell
kubectl -n database get secret mariadb-credentials -o jsonpath='{.data.mariadb-root-password}' | base64 -d
```

#### 7. [[Optional]]() execute sql in pod
```shell
kubectl -n database exec -it xxxx bash
```

```shell
mariadb -h 127.0.0.1 -u root -p$MARIADB_ROOT_PASSWORD
```
And then you can check connection by 
```sql
show status like  'Threads%';
```