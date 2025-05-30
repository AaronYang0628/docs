+++
title = 'Install MariaDB'
date = 2024-03-12T15:00:59+08:00
weight = 16
+++

### Preliminary
- Kubernetes has installed, if not check [link](kubernetes/command/install/index.html)
- argo workflows binary has installed, if not check [link](argo/argo-workflow/argoworkflow/index.html)
- minio artifact repository has been configured, if not check [link](kubernetes/command/artifact_repository/index.html)
    > endpoint: minio.storage:9000

### Steps
#### 1. prepare secret `argocd-login-credentials`
```shell
ARGOCD_USERNAME=admin
ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)
kubectl -n business-workflows create secret generic argocd-login-credentials \
    --from-literal=username=${ARGOCD_USERNAME} \
    --from-literal=password=${ARGOCD_PASSWORD}
```

#### 2. prepare RoleBinding `deploy-argocd-app-rbac.yaml`
```yaml
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: application-administrator
rules:
  - apiGroups:
      - argoproj.io
    resources:
      - applications
    verbs:
      - '*'
  - apiGroups:
      - apps
    resources:
      - deployments
    verbs:
      - '*'

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: application-administration
  namespace: argocd
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: application-administrator
subjects:
  - kind: ServiceAccount
    name: argo-workflow
    namespace: business-workflows

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: application-administration
  namespace: application
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: application-administrator
subjects:
  - kind: ServiceAccount
    name: argo-workflow
    namespace: business-workflows
```

#### 3. apply `deploy-argocd-app-rbac.yaml` to k8s
```shell
kubectl apply -f deploy-argocd-app-rbac.yaml
```

#### 4. prepare mariadb credentials secret
```shell
kubectl -n application create secret generic mariadb-credentials \
    --from-literal=mariadb-root-password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16) \
    --from-literal=mariadb-replication-password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16) \
    --from-literal=mariadb-password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16)
```

#### 5. prepare `deploy-mariadb.yaml`
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: deploy-argocd-app-mariadb-
spec:
  entrypoint: entry
  artifactRepositoryRef:
    configmap: artifact-repositories
    key: default-artifact-repository
  serviceAccountName: argo-workflow
  templates:
  - name: entry
    inputs:
      parameters:
      - name: argocd-server
        value: argo-cd-argocd-server.argocd:443
      - name: insecure-option
        value: --insecure
    dag:
      tasks:
      - name: apply
        template: apply
      - name: prepare-argocd-binary
        template: prepare-argocd-binary
        dependencies:
        - apply
      - name: sync
        dependencies:
        - prepare-argocd-binary
        template: sync
        arguments:
          artifacts:
          - name: argocd-binary
            from: "{{tasks.prepare-argocd-binary.outputs.artifacts.argocd-binary}}"
          parameters:
          - name: argocd-server
            value: "{{inputs.parameters.argocd-server}}"
          - name: insecure-option
            value: "{{inputs.parameters.insecure-option}}"
      - name: wait
        dependencies:
        - sync
        template: wait
        arguments:
          artifacts:
          - name: argocd-binary
            from: "{{tasks.prepare-argocd-binary.outputs.artifacts.argocd-binary}}"
          parameters:
          - name: argocd-server
            value: "{{inputs.parameters.argocd-server}}"
          - name: insecure-option
            value: "{{inputs.parameters.insecure-option}}"
      - name: init-db-tool
        template: init-db-tool
        dependencies:
        - wait
  - name: apply
    resource:
      action: apply
      manifest: |
        apiVersion: argoproj.io/v1alpha1
        kind: Application
        metadata:
          name: app-mariadb
          namespace: argocd
        spec:
          syncPolicy:
            syncOptions:
            - CreateNamespace=true
          project: default
          source:
            repoURL: https://charts.bitnami.com/bitnami
            chart: mariadb
            targetRevision: 16.5.0
            helm:
              releaseName: app-mariadb
              values: |
                architecture: standalone
                auth:
                  database: geekcity
                  username: aaron.yang
                  existingSecret: mariadb-credentials
                primary:
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
            namespace: application
  - name: prepare-argocd-binary
    inputs:
      artifacts:
      - name: argocd-binary
        path: /tmp/argocd
        mode: 755
        http:
          url: https://files.m.daocloud.io/github.com/argoproj/argo-cd/releases/download/v2.9.3/argocd-linux-amd64
    outputs:
      artifacts:
      - name: argocd-binary
        path: "{{inputs.artifacts.argocd-binary.path}}"
    container:
      image: m.daocloud.io/docker.io/library/fedora:39
      command:
      - sh
      - -c
      args:
      - |
        ls -l {{inputs.artifacts.argocd-binary.path}}
  - name: sync
    inputs:
      artifacts:
      - name: argocd-binary
        path: /usr/local/bin/argocd
      parameters:
      - name: argocd-server
      - name: insecure-option
        value: ""
    container:
      image: m.daocloud.io/docker.io/library/fedora:39
      env:
      - name: ARGOCD_USERNAME
        valueFrom:
          secretKeyRef:
            name: argocd-login-credentials
            key: username
      - name: ARGOCD_PASSWORD
        valueFrom:
          secretKeyRef:
            name: argocd-login-credentials
            key: password
      - name: WITH_PRUNE_OPTION
        value: --prune
      command:
      - sh
      - -c
      args:
      - |
        set -e
        export ARGOCD_SERVER={{inputs.parameters.argocd-server}}
        export INSECURE_OPTION={{inputs.parameters.insecure-option}}
        export ARGOCD_USERNAME=${ARGOCD_USERNAME:-admin}
        argocd login ${INSECURE_OPTION} --username ${ARGOCD_USERNAME} --password ${ARGOCD_PASSWORD} ${ARGOCD_SERVER}
        argocd app sync argocd/app-mariadb ${WITH_PRUNE_OPTION} --timeout 300
  - name: wait
    inputs:
      artifacts:
      - name: argocd-binary
        path: /usr/local/bin/argocd
      parameters:
      - name: argocd-server
      - name: insecure-option
        value: ""
    container:
      image: m.daocloud.io/docker.io/library/fedora:39
      env:
      - name: ARGOCD_USERNAME
        valueFrom:
          secretKeyRef:
            name: argocd-login-credentials
            key: username
      - name: ARGOCD_PASSWORD
        valueFrom:
          secretKeyRef:
            name: argocd-login-credentials
            key: password
      command:
      - sh
      - -c
      args:
      - |
        set -e
        export ARGOCD_SERVER={{inputs.parameters.argocd-server}}
        export INSECURE_OPTION={{inputs.parameters.insecure-option}}
        export ARGOCD_USERNAME=${ARGOCD_USERNAME:-admin}
        argocd login ${INSECURE_OPTION} --username ${ARGOCD_USERNAME} --password ${ARGOCD_PASSWORD} ${ARGOCD_SERVER}
        argocd app wait argocd/app-mariadb
  - name: init-db-tool
    resource:
      action: apply
      manifest: |
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: app-mariadb-tool
          namespace: application
          labels:
            app.kubernetes.io/name: mariadb-tool
        spec:
          replicas: 1
          selector:
            matchLabels:
              app.kubernetes.io/name: mariadb-tool
          template:
            metadata:
              labels:
                app.kubernetes.io/name: mariadb-tool
            spec:
              containers:
                - name: mariadb-tool
                  image:  m.daocloud.io/docker.io/bitnami/mariadb:10.5.12-debian-10-r0
                  imagePullPolicy: IfNotPresent
                  env:
                    - name: MARIADB_ROOT_PASSWORD
                      valueFrom:
                        secretKeyRef:
                          key: mariadb-root-password
                          name: mariadb-credentials
                    - name: TZ
                      value: Asia/Shanghai
```

#### 6. subimit to argo workflow client
```shell
argo -n business-workflows submit deploy-mariadb.yaml
```

#### 7. [[Optional]]() import data
import data by using sql file
```shell
MARIADB_ROOT_PASSWORD=$(kubectl -n application get secret mariadb-credentials -o jsonpath='{.data.mariadb-root-password}' | base64 -d)
POD_NAME=$(kubectl get pod -n application -l "app.kubernetes.io/name=mariadb-tool" -o jsonpath="{.items[0].metadata.name}") \
&& export SQL_FILENAME="Dump20240301.sql" \
&& kubectl -n application cp ${SQL_FILENAME} ${POD_NAME}:/tmp/${SQL_FILENAME} \
&& kubectl -n application exec -it deployment/app-mariadb-tool -- bash -c \
    'echo "create database ccds;" | mysql -h app-mariadb.application -uroot -p$MARIADB_ROOT_PASSWORD' \
&& kubectl -n application exec -it ${POD_NAME} -- bash -c \
    "mysql -h app-mariadb.application -uroot -p\${MARIADB_ROOT_PASSWORD} \
    ccds < /tmp/Dump20240301.sql"
```

#### 8. decode password
```shell
kubectl -n application get secret mariadb-credentials -o jsonpath='{.data.mariadb-root-password}' | base64 -d
```