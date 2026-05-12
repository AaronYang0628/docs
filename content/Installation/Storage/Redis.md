+++
tags = ["Reids"]
title = 'Install Reids'
date = 2024-05-07T15:00:59+08:00
weight = 180
+++


### Installation

{{< tabs groupid="prometheus" style="primary" title="Install By" icon="thumbtack" >}}

{{< tab title="Helm" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes is installed; if not, check 🔗<a href="/docs/kubernetes/cluster/index.html" target="_blank">link</a> </p></br>
  2. Helm is installed; if not, check 🔗<a href="/docs/Installation/binary/k8s_realted/index.html#helm" target="_blank">link</a> </p></br>

  <p> <b>1.get helm repo </b></p>

  {{% notice style="transparent" %}}
  ```bash
  helm repo add ay-helm-mirror https://aaronyang0628.github.io/helm-chart-mirror/charts
  helm repo update
  ```
  {{% /notice %}}

  <p> <b>2.install chart </b></p>

  {{% notice style="transparent" %}}
  ```bash
  helm install redis bitnami/redis \
    --namespace storage --create-namespace \
    --set architecture=standalone \
    --set auth.password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16)
  ```
  {{% /notice %}}

{{< /tab >}}

{{< tab title="ArgoCD (72602)" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes is installed; if not, check 🔗<a href="/docs/kubernetes/cluster/k3s/" target="_blank">link</a> </p></br>
  2. ArgoCD is installed; if not, check 🔗<a href="/docs/Installation/cicd/argocd/" target="_blank">link</a> </p></br>

  <p> <b>1.prepare redis secret </b></p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl get namespaces storage > /dev/null 2>&1 || kubectl create namespace storage
  kubectl -n storage create secret generic redis-shared-credentials \
    --from-literal=redis-password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16)
  ```
  {{% /notice %}}

  <p> <b>2.prepare</b> `deploy-redis.yaml` </p>

  {{% notice style="transparent" %}}
  ```yaml
  kubectl -n argocd apply -f - << EOF
  apiVersion: argoproj.io/v1alpha1
  kind: Application
  metadata:
    name: redis-shared
  spec:
    project: default
    syncPolicy:
      automated:
        prune: true
        selfHeal: true
      syncOptions:
      - CreateNamespace=true
    source:
      repoURL: https://charts.bitnami.com/bitnami
      chart: redis
      targetRevision: 18.16.0
      helm:
        releaseName: redis-shared
        values: |
          architecture: standalone
          auth:
            enabled: true
            existingSecret: redis-shared-credentials
          master:
            disableCommands:
              - FLUSHDB
              - FLUSHALL
            persistence:
              enabled: true
              storageClass: local-path
              size: 2Gi
          image:
            registry: m.daocloud.io/docker.io
            repository: bitnamilegacy/redis
            tag: latest
            pullPolicy: IfNotPresent
          metrics:
            enabled: false
          volumePermissions:
            enabled: false
          sysctl:
            enabled: false
    destination:
      server: https://kubernetes.default.svc
      namespace: storage
  EOF
  ```
  {{% /notice %}}

  <p> <b>3.sync by argocd</b></p>

  ```bash
  argocd app sync redis-shared
  ```

  <p> <b>4.verify</b></p>

  ```bash
  kubectl -n storage get pods -l app.kubernetes.io/instance=redis-shared
  kubectl -n storage exec redis-shared-master-0 -- redis-cli -a \
    "\$(kubectl -n storage get secret redis-shared-credentials -o jsonpath='{.data.redis-password}' | base64 -d)" ping
  ```

  <p> <b>5.connection info</b></p>

  ```
  Host: redis-shared-master.storage.svc.cluster.local
  Port: 6379
  Password: (stored in secret redis-shared-credentials)
  ```

{{< /tab >}}

{{< tab title="ArgoCD (Replication)" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes is installed; if not, check 🔗<a href="/docs/kubernetes/cluster/index.html" target="_blank">link</a> </p></br>
  2. Helm is installed; if not, check 🔗<a href="/docs/Installation/binary/k8s_realted/index.html#helm" target="_blank">link</a> </p></br>
  3. ArgoCD is installed; if not, check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>

  <p> <b>1.prepare redis secret </b></p>

  {{% notice style="transparent" %}}
  ```yaml
  kubectl get namespaces storage > /dev/null 2>&1 || kubectl create namespace storage
  kubectl -n storage create secret generic redis-credentials \
    --from-literal=redis-password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16)
  ```
  {{% /notice %}}


  <p> <b>2.prepare</b> `deploy-redis.yaml` </p>

  {{% notice style="transparent" %}}
  ```yaml
  kubectl -n argocd apply -f - << EOF
  apiVersion: argoproj.io/v1alpha1
  kind: Application
  metadata:
    name: redis
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
        releaseName: redis
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
              enabled: true
              storageClass: nfs-external
              size: 8Gi
          replica:
            replicaCount: 3
            disableCommands:
              - FLUSHDB
              - FLUSHALL
            persistence:
              enabled: true
              storageClass: nfs-external
              size: 8Gi
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
          extraDeploy:
            - |
              apiVersion: apps/v1
              kind: Deployment
              metadata:
                name: redis-tool
                namespace: csst
                labels:
                  app.kubernetes.io/name: redis-tool
              spec:
                replicas: 1
                selector:
                  matchLabels:
                    app.kubernetes.io/name: redis-tool
                template:
                  metadata:
                    labels:
                      app.kubernetes.io/name: redis-tool
                  spec:
                    containers:
                    - name: redis-tool
                      image: m.daocloud.io/docker.io/bitnami/redis:7.2.4-debian-12-r8
                      imagePullPolicy: IfNotPresent
                      env:
                      - name: REDISCLI_AUTH
                        valueFrom:
                          secretKeyRef:
                            key: redis-password
                            name: redis-credentials
                      - name: TZ
                        value: Asia/Shanghai
                      command:
                      - tail
                      - -f
                      - /etc/hosts
    destination:
      server: https://kubernetes.default.svc
      namespace: storage
  EOF
  ```
  {{% /notice %}}

  <p> <b>3.sync by argocd</b></p>

  {{% notice style="transparent" %}}
  ```bash
  argocd app sync argocd/redis
  ```
  {{% /notice %}}

  <p> <b>4.decode password</b></p>

  {{% notice style="transparent" %}}
  ```yaml
  kubectl -n storage get secret redis-credentials -o jsonpath='{.data.redis-password}' | base64 -d
  ```
  {{% /notice %}}

{{< /tab >}}


{{< tab title="Docker" style="transparent" >}}
 <p> <b>Preliminary </b></p>
  1. Docker|Podman|Buildah is installed; if not, check 🔗<a href="/docs/Installation/container/index.html" target="_blank">link</a> </p></br>
  

  {{% notice style="important" title="Using Proxy" %}} 
  you can run an addinational **daocloud** image to accelerate your pulling, check [Daocloud Proxy](daocloud/index.html)
  {{% /notice %}}


  <p> <b>1.init server </b></p> 

  {{% notice style="transparent" %}}
  ```bash

  ```
  {{% /notice %}}

{{< /tab >}}


{{< tab title="Argo Workflow" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes is installed; if not, check 🔗<a href="/docs/kubernetes/cluster/index.html" target="_blank">link</a> </p></br>
  2. Helm is installed; if not, check 🔗<a href="/docs/Installation/binary/k8s_realted/index.html#helm" target="_blank">link</a> </p></br>
  3. ArgoCD is installed; if not, check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  4. Argo Workflow is installed; if not, check 🔗<a href="/docs/argo/argo-workflow/install_argoworkflow/index.html" target="_blank">link</a> </p></br>


  <p> <b>1.prepare `argocd-login-credentials` </b></p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl get namespaces database > /dev/null 2>&1 || kubectl create namespace database
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

  <p> <b>4.prepare `deploy-xxxx-flow.yaml` </b></p>

  {{% notice style="transparent" %}}
  ```yaml

  ```
  {{% /notice %}}


  <p> <b>6.submit to argo workflow client</b></p> 

  {{% notice style="transparent" %}}
  ```bash
  argo -n business-workflows submit deploy-xxxx-flow.yaml
  ```
  {{% /notice %}}


  <p> <b>7.decode password</b></p> 

  {{% notice style="transparent" %}}
  ```bash
  kubectl -n application get secret xxxx-credentials -o jsonpath='{.data.xxx-password}' | base64 -d
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


## tests

* ```shell
  kubectl -n storage exec -it deployment/redis-tool -- \
      redis-cli -c -h redis-master.storage ping
  ```
* ```shell
  kubectl -n storage exec -it deployment/redis-tool -- \
      redis-cli -c -h redis-master.storage set mykey somevalue
  ```
* ```shell
  kubectl -n storage exec -it deployment/redis-tool -- \
      redis-cli -c -h redis-master.storage get mykey
  ```
* ```shell
  kubectl -n storage exec -it deployment/redis-tool -- \
      redis-cli -c -h redis-master.storage del mykey
  ```
* ```shell
  kubectl -n storage exec -it deployment/redis-tool -- \
      redis-cli -c -h redis-master.storage get mykey
  ```
