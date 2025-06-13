+++
tags = ["Clickhouse"]
title = 'Install Clickhouse'
date = 2024-03-07T15:00:59+08:00
weight = 3
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


  <p> <b>1.prepare admin credentials secret</b></p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl get namespaces database > /dev/null 2>&1 || kubectl create namespace database
  kubectl -n database create secret generic clickhouse-admin-credentials \
      --from-literal=password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16)
  ```
  {{% /notice %}}

  <p> <b>2.prepare `deploy-clickhouse.yaml` </b></p>

  {{% notice style="transparent" %}}
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
  {{% /notice %}}


  <p> <b>3.deploy clickhouse </b></p>
  {{% notice style="transparent" %}}
  ```bash
  kubectl -n argocd apply -f deploy-clickhouse.yaml
  ```
  {{% /notice %}}

  <p> <b>4.sync by argocd </b></p>
  {{% notice style="transparent" %}}
  ```bash
  argocd app sync argocd/clickhouse
  ```
  {{% /notice %}}

  <p> <b>5.prepare `clickhouse-interface.yaml` </b></p>

  {{% notice style="transparent" %}}
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
    - name: http
      port: 8123
      protocol: TCP
      targetPort: http
      nodePort: 31567
    - name: tcp
      port: 9000
      protocol: TCP
      targetPort: tcp
      nodePort: 32005
    selector:
      app.kubernetes.io/component: clickhouse
      app.kubernetes.io/instance: clickhouse
      app.kubernetes.io/name: clickhouse
    type: NodePort
  ```
  {{% /notice %}}

  <p> <b>6.apply to k8s </b></p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl -n database apply -f clickhouse-interface.yaml
  ```
  {{% /notice %}}

  <p> <b>7.extract clickhouse admin credentials  </b></p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl -n database get secret clickhouse-admin-credentials -o jsonpath='{.data.password}' | base64 -d
  ```
  {{% /notice %}}

  <p> <b>8.invoke http api  </b></p>

  {{% notice style="transparent" %}}
  ```text
  add `$K8S_MASTER_IP clickhouse.dev.geekcity.tech` to **/etc/hosts**
  ```
  ```shell
  CK_PASS=$(kubectl -n database get secret clickhouse-admin-credentials -o jsonpath='{.data.password}' | base64 -d)
  echo 'SELECT version()' | curl -k "https://admin:${CK_PASS}@clickhouse.dev.geekcity.tech:32443/" --data-binary @-
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
  mkdir -p clickhouse/{data,logs}
  podman run --rm \
      --ulimit nofile=262144:262144 \
      --name clickhouse-server \
      -p 18123:8123 \
      -p 19000:9000 \
      -v $(pwd)/clickhouse/data:/var/lib/clickhouse \
      -v $(pwd)/clickhouse/logs:/var/log/clickhouse-server \
      -e CLICKHOUSE_DB=my_database \
      -e CLICKHOUSE_DEFAULT_ACCESS_MANAGEMENT=1 \
      -e CLICKHOUSE_USER=ayayay \
      -e CLICKHOUSE_PASSWORD=123456 \
      -d m.daocloud.io/docker.io/clickhouse/clickhouse-server:23.11.5.29-alpine
  ```
  {{% /notice %}}

  <p> <b>2.check dashboard </b></p>
  And then you can visit 🔗<a href="http://localhost:18123" target="_blank">http://localhost:18123</a>

  <p> <b>3.use cli api </b></p>
  And then you can visit 🔗<a href="http://localhost:19000" target="_blank">http://localhost:19000</a>
  {{% notice style="transparent" %}}
  ```bash
  podman run --rm \
    --entrypoint clickhouse-client \
    -it m.daocloud.io/docker.io/clickhouse/clickhouse-server:23.11.5.29-alpine \
    --host host.containers.internal \
    --port 19000 \
    --user ayayay \
    --password 123456 \
    --query "select version()"
  ```
  {{% /notice %}}

  <p> <b>4.use visual client </b></p>
  {{% notice style="transparent" %}}
  ```bash
  podman run --rm -p 8080:80 -d m.daocloud.io/docker.io/spoonest/clickhouse-tabix-web-client:stable
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


  <p> <b>4.prepare clickhouse admin credentials secret </b></p> 

  {{% notice style="transparent" %}}
  ```bash
  kubectl get namespace application > /dev/null 2>&1 || kubectl create namespace application
  kubectl -n application create secret generic clickhouse-admin-credentials \
    --from-literal=password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16)
  ```
  {{% /notice %}}

  <p> <b>5.prepare deploy-clickhouse-flow.yaml </b></p> 

  {{% notice style="transparent" %}}
  ```yaml
  apiVersion: argoproj.io/v1alpha1
  kind: Workflow
  metadata:
    generateName: deploy-argocd-app-ck-
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
            name: app-clickhouse
            namespace: argocd
          spec:
            syncPolicy:
              syncOptions:
              - CreateNamespace=true
            project: default
            source:
              repoURL: https://charts.bitnami.com/bitnami
              chart: clickhouse
              targetRevision: 4.5.3
              helm:
                releaseName: app-clickhouse
                values: |
                  image:
                    registry: docker.io
                    repository: bitnami/clickhouse
                    tag: 23.12.3-debian-11-r0
                    pullPolicy: IfNotPresent
                  service:
                    type: ClusterIP
                  volumePermissions:
                    enabled: false
                    image:
                      registry: m.daocloud.io/docker.io
                      pullPolicy: IfNotPresent
                  ingress:
                    enabled: true
                    ingressClassName: nginx
                    annotations:
                      cert-manager.io/cluster-issuer: self-signed-ca-issuer
                      nginx.ingress.kubernetes.io/rewrite-target: /$1
                    path: /?(.*)
                    hostname: clickhouse.dev.geekcity.tech
                    tls: true
                  shards: 2
                  replicaCount: 3
                  persistence:
                    enabled: false
                  auth:
                    username: admin
                    existingSecret: clickhouse-admin-credentials
                    existingSecretKey: password
                  zookeeper:
                    enabled: true
                    image:
                      registry: m.daocloud.io/docker.io
                      repository: bitnami/zookeeper
                      tag: 3.8.3-debian-11-r8
                      pullPolicy: IfNotPresent
                    replicaCount: 3
                    persistence:
                      enabled: false
                    volumePermissions:
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
          argocd app sync argocd/app-clickhouse ${WITH_PRUNE_OPTION} --timeout 300
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
          argocd app wait argocd/app-clickhouse
  ```
  {{% /notice %}}

  <p> <b>6.subimit to argo workflow client </b></p> 

  {{% notice style="transparent" %}}
  ```bash
  argo -n business-workflows submit deploy-clickhouse-flow.yaml
  ```
  {{% /notice %}}

  <p> <b>7.extract clickhouse admin credentials  </b></p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl -n application get secret clickhouse-admin-credentials -o jsonpath='{.data.password}' | base64 -d
  ```
  {{% /notice %}}

  <p> <b>8.invoke http api  </b></p>

  {{% notice style="transparent" %}}
  ```text
  add `$K8S_MASTER_IP clickhouse.dev.geekcity.tech` to **/etc/hosts**
  ```
  ```shell
  CK_PASSWORD=$(kubectl -n application get secret clickhouse-admin-credentials -o jsonpath='{.data.password}' | base64 -d) && echo 'SELECT version()' | curl -k "https://admin:${CK_PASSWORD}@clickhouse.dev.geekcity.tech/" --data-binary @-
  ```
  {{% /notice %}}


  <p> <b>9.create external interface </b></p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl -n application apply -f - <<EOF
  apiVersion: v1
  kind: Service
  metadata:
    labels:
      app.kubernetes.io/component: clickhouse
      app.kubernetes.io/instance: app-clickhouse
      app.kubernetes.io/managed-by: Helm
      app.kubernetes.io/name: clickhouse
      app.kubernetes.io/version: 23.12.2
      argocd.argoproj.io/instance: app-clickhouse
      helm.sh/chart: clickhouse-4.5.3
    name: app-clickhouse-service-external
  spec:
    ports:
    - name: tcp
      port: 9000
      protocol: TCP
      targetPort: tcp
      nodePort: 30900
    selector:
      app.kubernetes.io/component: clickhouse
      app.kubernetes.io/instance: app-clickhouse
      app.kubernetes.io/name: clickhouse
    type: NodePort
  EOF
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