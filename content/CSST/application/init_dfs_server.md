+++
title = 'Init DFS Server'
date = 2024-03-12T15:00:59+08:00
weight = 43
+++

### Preliminary
- MariaDB has installed though argo-workflow, if not [check link](argo/argo-workflow/database/mariadb/index.html)
- Postgresql has installed though argo-workflow, if not [check link](argo/argo-workflow/database/postgres/index.html)
- And init mariadb has finished, if not [check link](csst/import/mariadb_import_data//index.html)
- And init postgresql has finished, if not [check link](csst/import/pg_import_data//index.html)

### Steps

#### 0. prepare `csst.yaml`
```yaml
global:
  fitsFileRootDir: /opt/temp/csst/fits_file
  fileExternalPrefix: http://csst.astrolab.cn/file
  tempDir: /tmp
etcd:
  host: 0.0.0.0
  port: 2379

redisChannel0:
  host: app-redis-master.application
  port: 6379
  db_id: 0
  channel0: channel0
  passwd:
  level0_list: single-image-reduction:data0

csst_db:
  enabled: true
  host: 172.27.253.66
  port: 30173
  user: "postgres"
  passwd: "woQ8btfS44ei1Bbx"
  db: "csst"
  maxIdleConnection: 100
  maxOpenConnection: 130
  connMaxLifetime: 100

csst_db_seq:
  enabled: true
  host: 172.27.253.66
  port: 30173
  user: "postgres"
  passwd: "woQ8btfS44ei1Bbx"
  db: "csst"
  maxIdleConnection: 100
  maxOpenConnection: 130
  connMaxLifetime: 100

csst_ck:
  enabled: true
  url: tcp://app-clickhouse-service-external.application:30900?compress=true
  host: app-clickhouse-service-external
  clusters: app-clickhouse-service-external:30900
  port: 30900
  db: csst
  user: admin
  passwd: "YEkvhrhEaeZTf7E0"

gateway:
  enabled: true
  url: csst-gateway.application:31280

ephem_ck_db:
  enabled: true
  url: tcp://app-clickhouse-service-external.application:30900?compress=true
  host: app-clickhouse-service-external
  port: 30900
  db: ephem
  user: admin
  passwd: "YEkvhrhEaeZTf7E0"
  maxIdleConnection: 100
  maxOpenConnection: 130
  connMaxLifetime: 100

csst_doris_db:
  enabled: true
  host: app-mariadb
  port: 3306
  user: "root"
  passwd: "IqzfDQfjkzfNhsCS"
  db: "ccds"
  maxIdleConnection: 100
  maxOpenConnection: 130
  connMaxLifetime: 100

redis:
  enabled: true
  conn: app-redis-master.application:6379
  dbNum: 8
  password:
  timeout: 3000
  sentinel:
    master: csstMaster
    nodes: app-redis-master.application:6379

jwt:
  secretKey: W6VjDud2W1kMG3BicbMNlGgI4ZfcoHtMGLWr

auth_srv:
  name: net.cnlab.csst.srv.auth.
  address:
  port: 9030
zap:
  level: error
  development: true
  logFileDir:
  outputPaths: []
  maxSize: 50
  maxBackups: 200
  maxAge: 10

dfs_srv:
  name: net.cnlab.csst.srv.dfs-srv.
  address:
  port: 9100

ephem_srv:
  name: net.cnlab.csst.srv.ephem.
  address:
  port: 9060

ephem_rest:
  name: net.cnlab.csst.srv.ephem-rest.
  address:
  port: 9068

user_srv:
  name: net.cnlab.csst.srv.user.
  address:
  port: 9090

fits_srv:
  name: net.cnlab.csst.srv.fits.
  address:
  port: 9002
```

#### 1. creat csst-credentials
```yaml
kubectl -n application create secret generic csst-credentials --from-file=./csst.yaml
```

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
                  - name: CONFIG_FILE_PATH
                    value: /app/csst.yaml
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
                  - name: dfs-csst-config
                    secret:
                      secretName: csst-credentials
                extraVolumeMounts:
                  - mountPath: /share/dfs
                    name: csst-data-pvc
                  - mountPath: /app
                    name: dfs-csst-config
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
