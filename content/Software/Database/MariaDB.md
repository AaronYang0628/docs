+++
tags = ["MariaDB"]
title = 'Install MariaDB'
date = 2024-03-07T15:00:59+08:00
weight = 130
+++


### Installation

{{< tabs groupid="prometheus" style="primary" title="Install By" icon="thumbtack" >}}

{{< tab title="Helm" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  2. Helm has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>

{{< /tab >}}

{{< tab title="ArgoCD" style="transparent">}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  2. argoCD has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  3. cert-manager has installed on argocd and the clusterissuer has a named `self-signed-ca-issuer`service, , if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>

  <p> <b>1.prepare mariadb credentials secret </b></p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl get namespaces database > /dev/null 2>&1 || kubectl create namespace database
  kubectl -n database create secret generic mariadb-credentials \
      --from-literal=mariadb-root-password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16) \
      --from-literal=mariadb-replication-password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16) \
      --from-literal=mariadb-password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16)
  ```
  {{% /notice %}}

  <p> <b>2.prepare `deploy-mariadb.yaml` </b></p>

  {{% notice style="transparent" %}}
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
  {{% /notice %}}


  <p> <b>3.deploy mariadb </b></p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl -n argocd apply -f deploy-mariadb.yaml
  ```
  {{% /notice %}}

  <p> <b>4.sync by argocd </b></p>

  {{% notice style="transparent" %}}
  ```bash
  argocd app sync argocd/mariadb
  ```
  {{% /notice %}}

  <p> <b>5.check mariadb </b></p>
  {{% notice style="transparent" %}}
  ```bash
  kubectl -n database get secret mariadb-credentials -o jsonpath='{.data.mariadb-root-password}' | base64 -d
  ```
  {{% /notice %}}


{{< /tab >}}

{{< tab title="Argo Workflow" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  2. ArgoCD has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  3. Argo Workflow has installed, if not check 🔗<a href="/docs/argo/argo-workflow/install_argoworkflow/index.html" target="_blank">link</a> </p></br>


  <p> <b>1.prepare `argocd-login-credentials` </b></p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl get namespaces database > /dev/null 2>&1 || kubectl create namespace database
  kubectl -n database create secret generic mariadb-credentials \
      --from-literal=mariadb-root-password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16) \
      --from-literal=mariadb-replication-password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16) \
      --from-literal=mariadb-password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16)
  ```
  {{% /notice %}}


  <p> <b>2.apply rolebinding to k8s </b></p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl -n argocd apply -f - <<EOF
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
  EOF
  ```
  {{% /notice %}}


  <p> <b>3.prepare mariadb credentials secret </b></p> 

  {{% notice style="transparent" %}}
  ```bash
  kubectl -n application create secret generic mariadb-credentials \
    --from-literal=mariadb-root-password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16) \
    --from-literal=mariadb-replication-password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16) \
    --from-literal=mariadb-password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16)
  ```
  {{% /notice %}}

  <p> <b>4.prepare `deploy-mariadb-flow.yaml` </b></p> 

  {{% notice style="transparent" %}}
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
  {{% /notice %}}

  <p> <b>5.subimit to argo workflow client </b></p> 

  {{% notice style="transparent" %}}
  ```bash
  argo -n business-workflows submit deploy-mariadb-flow.yaml
  ```
  {{% /notice %}}

  <p> <b>6.decode password </b></p> 

  {{% notice style="transparent" %}}
  ```bash
  kubectl -n application get secret mariadb-credentials -o jsonpath='{.data.mariadb-root-password}' | base64 -d
  ```
  {{% /notice %}}

{{< /tab >}}


{{< tab title="Docker Compose" style="default" >}}
  <p> <b>Preliminary </b></p>
  1. Docker has installed, if not check 🔗<a href="docs/software/container/docker/index.html" target="_blank">link</a> </p></br>
   

  {{% notice style="important" title="Using Proxy" %}} 
  you can run an addinational **daocloud** image to accelerate your pulling, check [Daocloud Proxy](daocloud/index.html)
  {{% /notice %}}

  <p> <b>1.init server </b></p>

  {{% notice style="transparent" %}}
  ```bash
  mkdir -p mariadb/data
  podman run  \
      -p 3306:3306 \
      -e MARIADB_ROOT_PASSWORD=mysql \
      -d m.daocloud.io/docker.io/library/mariadb:11.2.2-jammy \
      --log-bin \
      --binlog-format=ROW
  ```
  {{% /notice %}}

  <p> <b>2.use web console </b></p>
  And then you can visit 🔗<a href="http://localhost:8080" target="_blank">http://localhost:8080</a>

  <p> username: `root`  </p>
  <p> password: `mysql`  </p>

  {{% notice style="transparent" %}}
  ```bash
  podman run --rm -p 8080:80 \
      -e PMA_ARBITRARY=1 \
      -d m.daocloud.io/docker.io/library/phpmyadmin:5.1.1-apache
  ```
  {{% /notice %}}

  <p> <b>3.use internal client  </b></p>
  {{% notice style="transparent" %}}
  ```bash
  podman run --rm \
      -e MYSQL_PWD=mysql \
      -it m.daocloud.io/docker.io/library/mariadb:11.2.2-jammy \
      mariadb \
      --host host.containers.internal \
      --port 3306 \
      --user root \
      --database mysql \
      --execute 'select version()'
  ```
  {{% /notice %}}

{{< /tab >}}

{{< /tabs >}}


### Useful SQL
1. list all bin logs
```sql
SHOW BINARY LOGS;
```

2. delete previous bin logs
```sql
PURGE BINARY LOGS TO 'mysqld-bin.0000003'; # delete mysqld-bin.0000001 and mysqld-bin.0000002
PURGE BINARY LOGS BEFORE 'yyyy-MM-dd HH:mm:ss';
PURGE BINARY LOGS DATE_SUB(NOW(), INTERVAL 3 DAYS); # delete last three days bin log file.
```

{{% notice style="grey" icon=""%}}
If you using master-slave mode, you can change all **BINARY** to **MASTER**
{{% /notice %}}

### FAQ

{{% expand title="Q1: Show me almost **endless** possibilities" %}}
You can add standard markdown syntax:

- multiple paragraphs
- bullet point lists
- _emphasized_, **bold** and even **_bold emphasized_** text
- [links](https://example.com)
- etc.

```plaintext
...and even source code
```

> the possibilities are endless (almost - including other shortcodes may or may not work)
{{% /expand %}}


{{% expand title="Q2: Show me almost **endless** possibilities" %}}
You can add standard markdown syntax:

- multiple paragraphs
- bullet point lists
- _emphasized_, **bold** and even **_bold emphasized_** text
- [links](https://example.com)
- etc.

```plaintext
...and even source code
```

> the possibilities are endless (almost - including other shortcodes may or may not work)
{{% /expand %}}