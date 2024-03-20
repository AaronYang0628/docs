+++
title = 'Init DFS Server'
date = 2024-03-12T15:00:59+08:00
weight = 43
+++

### Preliminary
- MariaDB has installed though argo-workflow, if not [check link](kubernetes/argo/argo-workflow/software/mariadb/index.html)
- Postgresql has installed though argo-workflow, if not [check link](kubernetes/argo/argo-workflow/software/postgres/index.html)
- And init mariadb has finished, if not [check link](csst/mariadb_import_data//index.html)
- And init postgresql has finished, if not [check link](csst/pg_import_data//index.html)

### Steps

#### 1. [[Optional]]() init config server
asaaasa

#### 2. [[Optional]]() prepare `csst-data-pvc.yaml`

```yaml
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

#### 3. prepare `deploy-dfs-server.yaml`
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: deploy-dfs-server-
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
          name: dfs-server
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
              releaseName: dfs-server
              values: |
                image:
                  registry: cr.registry.res.cloud.wuxi-yqgcy.cn
                  repository: mirror/dfs-server
                  tag: v240306-r1
                  pullPolicy: IfNotPresent
                extraEnvVars:
                  - name: ZONEINFO
                    value: /opt/zoneinfo.zip
                  - name: TZ
                    value: Asia/Shanghai
                  - name: PYTHONPATH
                    value: /work/csst-py/:/work/csst-py/dfs-srv:/work/packages:/work/csst-dfs-proto-py:/work/csst-dfs-commons:/work/csst-dfs-base
                containerSecurityContext:
                  enabled: false
                containerPorts:
                  http: 9100
                extraVolumes:
                  - name: csst-data-pvc
                    persistentVolumeClaim:
                      claimName: csst-data-pvc
                extraVolumeMounts:
                  - mountPath: /share/dfs
                    name: csst-data-pvc
                service:
                  type: ClusterIP
                  ports:
                    http: 9100
                  targetPort:
                    http: http
                ingress:
                  enabled: false
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
        argocd app sync argocd/dfs-server ${WITH_PRUNE_OPTION} --timeout 300
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
        argocd app wait argocd/dfs-server
```

#### 4. [[Optional]]() create pvc resource
```shell
kubectl -n application apply -f csst-data-pvc.yaml
```

#### 5. subimit to argo workflow client
```shell
argo -n business-workflows submit deploy-dfs-server.yaml
```
