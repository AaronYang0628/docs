+++
title = 'Install MariaDB'
date = 2024-03-12T15:00:59+08:00
weight = 6
+++

### Preliminary
- Kubernetes has installed, if not check [link](kubernetes/command/install/index.html)
- argoCD has installed, if not check [link](argo/argo-cd/argocd/index.html)
- cert-manager has installed on argocd and the clusterissuer has a named `self-signed-ca-issuer`service, , if not check [link](argo/argo-cd/application/cert_manager/index.html)

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
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: mariadb
spec:
  syncPolicy:
    syncOptions:
    - CreateNamespace=true
  project: default
  source:
    repoURL: https://charts.bitnami.com/bitnami
    chart: mariadb
    targetRevision: 16.3.2
    helm:
      releaseName: mariadb
      values: |
        architecture: standalone
        auth:
          database: test-mariadb
          username: aaron.yang
          existingSecret: mariadb-credentials
        primary:
          extraFlags: "--character-set-server=utf8mb4 --collation-server=utf8mb4_bin"
          persistence:
            enabled: false
        secondary:
          replicaCount: 1
          persistence:
            enabled: false
        image:
          registry: m.daocloud.io/docker.io
          pullPolicy: IfNotPresent
        volumePermissions:
          enabled: false
          image:
            registry: m.daocloud.io/docker.io
            pullPolicy: IfNotPresent
        metrics:
          enabled: false
          image:
            registry: m.daocloud.io/docker.io
            pullPolicy: IfNotPresent
  destination:
    server: https://kubernetes.default.svc
    namespace: database
```


#### 3. apply to k8s
```shell
kubectl -n argocd apply -f deploy-mariadb.yaml
```

#### 4. sync by argocd
```shell
argocd app sync argocd/mariadb
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

#### 6. decode password
```shell
kubectl -n database get secret mariadb-credentials -o jsonpath='{.data.mariadb-root-password}' | base64 -d
```

#### 7. exec into pod
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