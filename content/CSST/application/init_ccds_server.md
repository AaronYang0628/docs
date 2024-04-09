+++
title = 'Init CCDS Server'
date = 2024-03-12T15:00:59+08:00
weight = 32
+++

### Preliminary
- MariaDB has installed though argo-workflow, if not [check link](kubernetes/argo/argo-workflow/software/mariadb/index.html)
- Redis has installed though argo-workflow, if not [check link](kubernetes/argo/argo-workflow/software/redis/index.html)
- And init mariadb has finished, if not [check link](../mariadb_import_data//index.html)
- `nfs-external-nas` nas server has initialized as somewhere, if not [check link](kubernetes/conatiner/software/nfs/index.html)

### Steps

#### 1. decode mariadb password
```shell
kubectl -n application get secret mariadb-credentials -o jsonpath='{.data.mariadb-root-password}' | base64 -d
```

#### 2. prepare `combo-data-pvc.yaml`

```yaml
---
apiVersion: "v1"
kind: "PersistentVolumeClaim"
metadata:
  name: "ccds-data-pvc"
  namespace: "application"
spec:
  accessModes:
  - "ReadWriteMany"
  resources:
    requests:
      storage: "200Gi"
  storageClassName: "nfs-external-nas"
status:
  accessModes:
  - "ReadWriteMany"
  capacity:
    storage: "200Gi"
---
apiVersion: "v1"
kind: "PersistentVolumeClaim"
metadata:
  name: "csst-data-pvc"
  namespace: "application"
spec:
  accessModes:
  - "ReadWriteMany"
  resources:
    requests:
      storage: "200Gi"
  storageClassName: "nfs-external-nas"
status:
  accessModes:
  - "ReadWriteMany"
  capacity:
    storage: "200Gi"
```

#### 3. prepare `deploy-ccds-server.yaml`
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: deploy-ccds-
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
  - name: apply
    resource:
      action: apply
      manifest: |
        apiVersion: argoproj.io/v1alpha1
        kind: Application
        metadata:
          name: ccds-server
          namespace: argocd
        spec:
          syncPolicy:
            syncOptions:
            - CreateNamespace=true
          project: default
          source:
            repoURL: https://charts.bitnami.com/bitnami
            chart: nginx
            targetRevision: 15.10.4
            helm:
              releaseName: ccds-server
              values: |
                image:
                  registry: cr.registry.res.cloud.wuxi-yqgcy.cn
                  repository: csst/ccds
                  tag: V1-argo-test
                  pullPolicy: IfNotPresent
                extraEnvVars:
                  - name: TZ
                    value: Asia/Shanghai
                  - name: FLASK_DEBUG
                    value: "0"
                  - name: FLASK_ENV
                    value: "production"
                  - name: DATABASE_URL
                    value: "mysql://root:IqzfDQfjkzfNhsCS@app-mariadb.application:3306/ccds?charset=utf8"
                  - name: REDIS_HOST
                    value: "app-redis-master.application"
                  - name: REDIS_PWD
                    value: "THY7BxnEIOeecarE"
                  - name: REDIS_PORT
                    value: "6379"
                  - name: CSST_DFS_API_MODE
                    value: "cluster"
                  - name: CSST_DFS_GATEWAY
                    value: "csst-gateway.csst:80"
                  - name: CSST_DFS_APP_ID
                    value: "test"
                  - name: CSST_DFS_APP_TOKEN
                    value: "test"
                containerSecurityContext:
                  enabled: false
                replicaCount: 1
                containerPorts:
                  http: 9000
                extraVolumes:
                  - name: csst-data-pvc
                    persistentVolumeClaim:
                      claimName: csst-data-pvc
                  - name: ccds-data-pvc
                    persistentVolumeClaim:
                      claimName: ccds-data-pvc
                extraVolumeMounts:
                  - mountPath: /csst-data
                    name: csst-data-pvc
                  - mountPath: /ccds-data
                    name: ccds-data-pvc
                service:
                  type: ClusterIP
                  ports:
                    http: 9000
                  targetPort:
                    http: 9000
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
        argocd app sync argocd/ccds-server ${WITH_PRUNE_OPTION} --timeout 300
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
        argocd app wait argocd/ccds-server
```

#### 4. create pvc resource
```shell
kubectl -n application apply -f combo-data-pvc.yaml
```

#### 5. subimit to argo workflow client
```shell
argo -n business-workflows submit deploy-ccds-server.yaml
```
