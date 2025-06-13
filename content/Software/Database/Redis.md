+++
title = 'Install Redis'
date = 2024-03-07T15:00:59+08:00
weight = 7
+++

### Installation

{{< tabs groupid="prometheus" style="primary" title="Install By" icon="thumbtack" >}}

{{< tab title="Helm" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/kubernetes/cluster/index.html" target="_blank">link</a> </p></br>
  2. Helm has installed, if not check 🔗<a href="/docs/software/binary/k8s_realted/index.html#helm" target="_blank">link</a> </p></br>

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
  helm install ay-helm-mirror/kube-prometheus-stack --generate-name
  ```
  {{% /notice %}}

  {{% notice style="important" title="Using Proxy" %}} 
  for more information, you can check 🔗[https://artifacthub.io/packages/helm/prometheus-community/prometheus](https://artifacthub.io/packages/helm/prometheus-community/prometheus)
  {{% /notice %}}

{{< /tab >}}

{{< tab title="ArgoCD" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/kubernetes/cluster/index.html" target="_blank">link</a> </p></br>
  2. Helm has installed, if not check 🔗<a href="/docs/software/binary/k8s_realted/index.html#helm" target="_blank">link</a> </p></br>
  3. ArgoCD has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>

  <p> <b>1.prepare</b> `deploy-xxxxx.yaml` </p>

  {{% notice style="transparent" %}}
  ```yaml

  ```
  {{% /notice %}}

  <p> <b>2.apply to k8s</b></p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl -n argocd apply -f xxxx.yaml
  ```
  {{% /notice %}}

  <p> <b>3.sync by argocd</b></p>

  {{% notice style="transparent" %}}
  ```bash
  argocd app sync argocd/xxxx
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
  1. Docker|Podman|Buildah has installed, if not check 🔗<a href="/docs/software/container/index.html" target="_blank">link</a> </p></br>
  

  {{% notice style="important" title="Using Proxy" %}} 
  you can run an addinational **daocloud** image to accelerate your pulling, check [Daocloud Proxy](daocloud/index.html)
  {{% /notice %}}


  <p> <b>1.init server </b></p> 

  {{% notice style="transparent" %}}
  ```bash
  mkdir -p $(pwd)/redis/data
  podman run --rm \
      --name redis \
      -p 6379:6379 \
      -d docker.io/library/redis:7.2.4-alpine
  ```
  {{% /notice %}}

  <p> <b>1.use internal client </b></p> 

  {{% notice style="transparent" %}}
  ```bash
  podman run --rm \
      -it docker.io/library/redis:7.2.4-alpine \
      redis-cli \
      -h host.containers.internal \
      set mykey somevalue
  ```
  {{% /notice %}}

{{< /tab >}}


{{< tab title="Argo Workflow" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/kubernetes/cluster/index.html" target="_blank">link</a> </p></br>
  2. Helm has installed, if not check 🔗<a href="/docs/software/binary/k8s_realted/index.html#helm" target="_blank">link</a> </p></br>
  3. ArgoCD has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  4. Argo Workflow has installed, if not check 🔗<a href="/docs/argo/argo-workflow/install_argoworkflow/index.html" target="_blank">link</a> </p></br>
  5. Minio artifact repository has been configured, if not check 🔗<a href="/docs/software/storage/minio/index.html" target="_blank">link</a> </p></br>
  - endpoint: minio.storage:9000


  <p> <b>1.prepare `argocd-login-credentials` </b></p>

  {{% notice style="transparent" %}}
  ```bash
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

  <p> <b>3.prepare redis credentials secret </b></p> 

  {{% notice style="transparent" %}}
  ```bash
  kubectl -n application create secret generic redis-credentials \
    --from-literal=redis-password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16)
  ```
  {{% /notice %}}

  <p> <b>4.prepare `deploy-redis-flow.yaml` </b></p>

  {{% notice style="transparent" %}}
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
  {{% /notice %}}

  <p> <b>6.subimit to argo workflow client</b></p> 

  {{% notice style="transparent" %}}
  ```bash
  argo -n business-workflows submit deploy-redis-flow.yaml
  ```
  {{% /notice %}}


  <p> <b>7.decode password</b></p> 

  {{% notice style="transparent" %}}
  ```bash
  kubectl -n application get secret redis-credentials -o jsonpath='{.data.redis-password}' | base64 -d
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