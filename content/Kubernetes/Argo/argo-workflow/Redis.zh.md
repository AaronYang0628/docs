+++
title = 'Install Redis'
date = 2024-03-12T15:00:59+08:00
weight = 15
+++

### Preliminary
- Kubernetes has installed, if not check [link](kubernetes/command/install/index.html)
- argo workflows binary has installed, if not check [link](kubernetes/argo/argo-workflow/argoworkflow/index.html)
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
```

#### 3. apply `deploy-argocd-app-rbac.yaml` to k8s
```shell
kubectl -n argocd apply -f deploy-argocd-app-rbac.yaml
```

#### 4. prepare redis credentials secret
```shell
kubectl -n application create secret generic redis-credentials \
    --from-literal=redis-password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16)
```

#### 5. prepare `deploy-redis.yaml`
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: deploy-argocd-app-redis-
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
        value: argocd-server.argocd:443
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
          name: app-redis
          namespace: argocd
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
              releaseName: app-redis
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
                    enabled: false
                replica:
                  replicaCount: 3
                  disableCommands:
                    - FLUSHDB
                    - FLUSHALL
                  persistence:
                    enabled: false
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
        argocd app sync argocd/app-redis ${WITH_PRUNE_OPTION} --timeout 300
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
        argocd app wait argocd/app-redis
```

#### 6. subimit to argo workflow client
```shell
argo -n business-workflows submit deploy-redis.yaml
```
