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