+++
title = 'Install Postgresql'
date = 2024-03-07T15:00:59+08:00
weight = 160
+++

### Installation

{{< tabs groupid="prometheus" style="primary" title="Install By" icon="thumbtack" >}}

{{< tab title="Helm" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/kubernetes/cluster/index.html" target="_blank">link</a> </p></br>
  2. Helm has installed, if not check 🔗<a href="/docs/Installation/binary/helm/index.html" target="_blank">link</a> </p></br>

  <p> <b>1.get helm repo </b></p>

  {{% notice style="transparent" %}}
  ```bash
  helm repo add bitnami https://charts.bitnami.com/bitnami
  helm repo update
  ```
  {{% /notice %}}

  <p> <b>2.install chart </b></p>

  {{% notice style="transparent" %}}
  ```bash
  helm install bitnami/postgresql --generate-name --version 18.1.8
  ```
  {{% /notice %}}

  {{% notice style="important" title="Using Proxy" %}} 
  for more information, you can check 🔗[https://artifacthub.io/packages/helm/prometheus-community/prometheus](https://artifacthub.io/packages/helm/prometheus-community/prometheus)
  ```shell
  helm repo add ay-helm-mirror https://aaronyang0628.github.io/helm-chart-mirror/charts
  helm repo update
  helm install my-postgresql ay-helm-mirror/postgresql --version 18.1.8
  ```
  {{% /notice %}}

{{< /tab >}}

{{< tab title="ArgoCD" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/kubernetes/cluster/index.html" target="_blank">link</a> </p></br>
  2. Helm has installed, if not check 🔗<a href="/docs/Installation/binary/helm/index.html" target="_blank">link</a> </p></br>
  3. ArgoCD has installed, if not check 🔗<a href="/docs/installation/cicd/argocd/index.html" target="_blank">link</a> </p></br>
   
  <p> <b>1.prepare</b> `postgresql-credentials` </p>

  {{% notice style="transparent" %}}
  ```shell
  kubectl get namespaces database > /dev/null 2>&1 || kubectl create namespace database
  kubectl -n database create secret generic postgresql-credentials \
      --from-literal=postgres-password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16) \
      --from-literal=password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16) \
      --from-literal=replication-password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16)
  ```
  {{% /notice %}}

  <p> <b>2.prepare</b> `deploy-postgresql.yaml` </p>

  {{% notice style="transparent" %}}
  ```yaml
  kubectl -n argocd apply -f - <<EOF
  apiVersion: argoproj.io/v1alpha1
  kind: Application
  metadata:
    name: postgresql
  spec:
    syncPolicy:
      syncOptions:
      - CreateNamespace=true
    project: default
    source:
      repoURL: https://aaronyang0628.github.io/helm-chart-mirror/charts
      chart: postgresql
      targetRevision: 18.1.8
      helm:
        releaseName: postgresql
        values: |
          global:
            security:
              allowInsecureImages: true
          architecture: standalone
          auth:
            database: n8n
            username: n8n
            existingSecret: postgresql-credentials
          primary:
            persistence:
              enabled: true
              storageClass: local-path
              size: 8Gi
          readReplicas:
            replicaCount: 1
            persistence:
              enabled: true
              storageClass: local-path
              size: 8Gi
          backup:
            enabled: false
          image:
            registry: m.daocloud.io/registry-1.docker.io
            pullPolicy: IfNotPresent
          volumePermissions:
            enabled: false
            image:
              registry: m.daocloud.io/registry-1.docker.io
              pullPolicy: IfNotPresent
          metrics:
            enabled: false
            image:
              registry: m.daocloud.io/registry-1.docker.io
              pullPolicy: IfNotPresent
      extraDeploy:
      - apiVersion: traefik.io/v1alpha1
        kind: IngressRouteTCP
        metadata:
          name: postgres-tcp
          namespace: database
        spec:
          entryPoints:
            - postgres
          routes:
          - match: HostSNI(`*`)
            services:
            - name: postgresql
              port: 5432
      - apiVersion: networking.k8s.io/v1
        kind: Ingress
        metadata:
          name: postgres-tcp-ingress
          annotations:
            kubernetes.io/ingress.class: nginx
        spec:
          rules:
          - host: postgres.ay.dev
            http:
              paths:
              - path: /
                pathType: Prefix
                backend:
                  service:
                    name: postgresql
                    port:
                      number: 5342
    destination:
      server: https://kubernetes.default.svc
      namespace: database
  EOF
  ```
  {{% /notice %}}

  <p> <b>3.sync by argocd</b></p>

  {{% notice style="transparent" %}}
  ```bash
  argocd app sync argocd/postgresql
  ```
  {{% /notice %}}

  <p> <b>4.prepare yaml-content.yaml</b></p>

  {{% notice style="transparent" %}}
  ```yaml
  

  ```
  {{% /notice %}}

  <p> <b>5.apply to k8s</b></p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl apply -f xxxx.yaml
  ```
  {{% /notice %}}

  <p> <b>6.apply xxxx.yaml directly</b></p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl apply -f - <<EOF
  
  EOF
  ```
  {{% /notice %}}

{{< /tab >}}


{{< tab title="Docker" style="transparent" >}}
 <p> <b>Preliminary </b></p>
  1. Docker|Podman|Buildah has installed, if not check 🔗<a href="/docs/Installation/container/index.html" target="_blank">link</a> </p></br>
  

  {{% notice style="important" title="Using Proxy" %}} 
  you can run an addinational **daocloud** image to accelerate your pulling, check [Daocloud Proxy](daocloud/index.html)
  {{% /notice %}}


  <p> <b>1.init server </b></p> 

  {{% notice style="transparent" %}}
  ```bash
  mkdir -p $(pwd)/postgresql/data
  podman run --rm \
      --name postgresql \
      -p 5432:5432 \
      -e POSTGRES_PASSWORD=postgresql \
      -e PGDATA=/var/lib/postgresql/data/pgdata \
      -v $(pwd)/postgresql/data:/var/lib/postgresql/data \
      -d docker.io/library/postgres:15.2-alpine3.17
  ```
  {{% /notice %}}

  <p> <b>2.use web console </b></p> 

  {{% notice style="transparent" %}}
  ```bash
  podman run --rm \
    -p 8080:80 \
    -e 'PGADMIN_DEFAULT_EMAIL=ben.wangz@foxmail.com' \
    -e 'PGADMIN_DEFAULT_PASSWORD=123456' \
    -d docker.io/dpage/pgadmin4:6.15
  ```
  {{% /notice %}}
  And then you can visit  🔗<a href="http://localhost:8080" target="_blank">[http://localhost:8080] </a> </p></br>


  <p> <b>3.use internal client </b></p> 

  {{% notice style="transparent" %}}
  ```bash
  podman run --rm \
      --env PGPASSWORD=postgresql \
      --entrypoint psql \
      -it docker.io/library/postgres:15.2-alpine3.17 \
      --host host.containers.internal \
      --port 5432 \
      --username postgres \
      --dbname postgres \
      --command 'select version()'
  ```
  {{% /notice %}}


{{< /tab >}}


{{< tab title="Argo Workflow" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/kubernetes/cluster/index.html" target="_blank">link</a> </p></br>
  2. Helm has installed, if not check 🔗<a href="/docs/Installation/binary/k8s_realted/index.html#helm" target="_blank">link</a> </p></br>
  3. ArgoCD has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  4. Argo Workflow has installed, if not check 🔗<a href="/docs/argo/argo-workflow/install_argoworkflow/index.html" target="_blank">link</a> </p></br>
  5. Minio artifact repository has been configured, if not check 🔗<a href="/docs/Installation/storage/minio/index.html" target="_blank">link</a> </p></br>
  - endpoint: minio.storage:9000


  <p> <b>1.prepare `argocd-login-credentials` </b></p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl get namespaces database > /dev/null 2>&1 || kubectl create namespace database
  ARGOCD_USERNAME=admin
  ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)
  kubectl -n business-workflows create secret generic argocd-login-credentials \
      --from-literal=username=${ARGOCD_USERNAME} \
      --from-literal=password=${ARGOCD_PASSWORD}
  ```
  {{% /notice %}}


  <p> <b>2.apply rolebinding to k8s </b></p>

  {{% notice style="transparent" %}}
  ```yaml
  kubectl apply -f - <<EOF
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

  <p> <b>3.prepare postgresql admin credentials secret </b></p> 

  {{% notice style="transparent" %}}
  ```bash
  kubectl -n application create secret generic postgresql-credentials \
    --from-literal=postgres-password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16) \
    --from-literal=password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16) \
    --from-literal=replication-password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16)
  ```
  {{% /notice %}}

  <p> <b>4.prepare `deploy-postgresql-flow.yaml` </b></p>

  {{% notice style="transparent" %}}
  ```yaml
  apiVersion: argoproj.io/v1alpha1
  kind: Workflow
  metadata:
    generateName: deploy-argocd-app-pg-
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
            name: app-postgresql
            namespace: argocd
          spec:
            syncPolicy:
              syncOptions:
              - CreateNamespace=true
            project: default
            source:
              repoURL: https://charts.bitnami.com/bitnami
              chart: postgresql
              targetRevision: 14.2.2
              helm:
                releaseName: app-postgresql
                values: |
                  architecture: standalone
                  auth:
                    database: geekcity
                    username: aaron.yang
                    existingSecret: postgresql-credentials
                  primary:
                    persistence:
                      enabled: false
                  readReplicas:
                    replicaCount: 1
                    persistence:
                      enabled: false
                  backup:
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
          argocd app sync argocd/app-postgresql ${WITH_PRUNE_OPTION} --timeout 300
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
          argocd app wait argocd/app-postgresql
    - name: init-db-tool
      resource:
        action: apply
        manifest: |
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: app-postgresql-tool
            namespace: application
            labels:
              app.kubernetes.io/name: postgresql-tool
          spec:
            replicas: 1
            selector:
              matchLabels:
                app.kubernetes.io/name: postgresql-tool
            template:
              metadata:
                labels:
                  app.kubernetes.io/name: postgresql-tool
              spec:
                containers:
                  - name: postgresql-tool
                    image: m.daocloud.io/docker.io/bitnami/postgresql:14.4.0-debian-11-r9
                    imagePullPolicy: IfNotPresent
                    env:
                      - name: POSTGRES_PASSWORD
                        valueFrom:
                          secretKeyRef:
                            key: postgres-password
                            name: postgresql-credentials
                      - name: TZ
                        value: Asia/Shanghai
                    command:
                      - tail
                    args:
                      - -f
                      - /etc/hosts
  ```
  {{% /notice %}}


  <p> <b>6.subimit to argo workflow client</b></p> 

  {{% notice style="transparent" %}}
  ```bash
  argo -n business-workflows submit deploy-postgresql.yaml
  ```
  {{% /notice %}}


  <p> <b>7.decode password</b></p> 

  {{% notice style="transparent" %}}
  ```bash
  kubectl -n application get secret postgresql-credentials -o jsonpath='{.data.postgres-password}' | base64 -d
  ```
  {{% /notice %}}


  <p> <b>8.import data</b></p> 

  {{% notice style="transparent" %}}
  ```bash
  POSTGRES_PASSWORD=$(kubectl -n application get secret postgresql-credentials -o jsonpath='{.data.postgres-password}' | base64 -d) \
  POD_NAME=$(kubectl get pod -n application -l "app.kubernetes.io/name=postgresql-tool" -o jsonpath="{.items[0].metadata.name}") \
  && export SQL_FILENAME="init_dfs_table_data.sql" \
  && kubectl -n application cp ${SQL_FILENAME} ${POD_NAME}:/tmp/${SQL_FILENAME} \
  && kubectl -n application exec -it deployment/app-postgresql-tool -- bash -c \
      'echo "CREATE DATABASE csst;" | PGPASSWORD="$POSTGRES_PASSWORD" \
      psql --host app-postgresql.application -U postgres -d postgres -p 5432' \
  && kubectl -n application exec -it deployment/app-postgresql-tool -- bash -c \
      'PGPASSWORD="$POSTGRES_PASSWORD" psql --host app-postgresql.application \
      -U postgres -d csst -p 5432 < /tmp/init_dfs_table_data.sql'
  ```
  {{% /notice %}}

{{< /tab >}}


{{< /tabs >}}



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





