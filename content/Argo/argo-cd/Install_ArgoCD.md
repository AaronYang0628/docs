+++
title = 'Install Argo CD'
date = 2024-03-07T15:00:59+08:00
weight = 1
+++

### Preliminary
- Kubernets has installed, if not [check 🔗link](kubernetes/command/install/index.html)
  
> [!TIP]
> Helm binary has installed, if not [check 🔗link](/kubernetes/helm/helm_chart/index.html)

### 1. install argoCD binary
```shell
MIRROR="files.m.daocloud.io/"
VERSION=v2.9.3
[ $(uname -m) = x86_64 ] && curl -sSLo argocd "https://${MIRROR}github.com/argoproj/argo-cd/releases/download/${VERSION}/argocd-linux-amd64"
[ $(uname -m) = aarch64 ] && curl -sSLo argocd "https://${MIRROR}github.com/argoproj/argo-cd/releases/download/${VERSION}/argocd-linux-arm64"
chmod u+x argocd
mkdir -p ${HOME}/bin
mv -f argocd ${HOME}/bin
```

### 2. install components

{{< tabs groupid="argocd" style="primary" title="Install By" icon="thumbtack" >}}
{{< tab title="Helm" >}}
  <a><b>1. Prepare argocd.values.yaml</b></a> <br/>
  {{< tabs groupid="tabs-example-language" >}}
    {{% tab title="`argocd.values.yaml`" %}}
    crds:
      install: true
      keep: false
    global:
      revisionHistoryLimit: 3
      image:
        repository: m.daocloud.io/quay.io/argoproj/argocd
        imagePullPolicy: IfNotPresent
    redis:
      enabled: true
      image:
        repository: m.daocloud.io/docker.io/library/redis
      exporter:
        enabled: false
        image:
          repository: m.daocloud.io/bitnami/redis-exporter
      metrics:
        enabled: false
    redis-ha:
      enabled: false
      image:
        repository: m.daocloud.io/docker.io/library/redis
      configmapTest:
        repository: m.daocloud.io/docker.io/koalaman/shellcheck
      haproxy:
        enabled: false
        image:
          repository: m.daocloud.io/docker.io/library/haproxy
      exporter:
        enabled: false
        image: m.daocloud.io/docker.io/oliver006/redis_exporter
    dex:
      enabled: true
      image:
        repository: m.daocloud.io/ghcr.io/dexidp/dex
    {{% /tab%}}
  {{< /tabs >}}

  <a><b>2. Install argoCD </b></a><br/>

  {{< tabs groupid="tabs-example-language" >}}
    {{% tab title="shell" %}}

    helm install argo-cd argo-cd \
      --namespace argocd \
      --create-namespace \
      --version 5.46.7 \
      --repo https://aaronyang0628.github.io/helm-chart-mirror/charts \
      --values argocd.values.yaml \
      --atomic

    {{% /tab%}}
  {{< /tabs >}}

{{< /tab >}}

{{< tab title="File/URL" style="default" color="darkorchid" >}}
  by default you can install argocd by this <a href="https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml">link</a>
  {{< tabs groupid="tabs-example-language" >}}
  {{% tab title="shell" %}}
  ```shell
  kubectl create namespace argocd \
  && kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
  ```
  {{% /tab %}}
  {{< /tabs >}}
  </br>
  Or, you can use your won flle link.
{{< /tab >}}
{{< /tabs >}}



### 4. prepare `argocd-server-external.yaml`
{{< tabs groupid="argocd" style="primary" title="Install By" icon="thumbtack" >}}
  {{< tab title="Helm" >}}
    {{< tabs groupid="tabs-example-language" >}}
      {{% tab title="yaml" %}}
  ```yaml
  apiVersion: v1
  kind: Service
  metadata:
    labels:
      app.kubernetes.io/component: server
      app.kubernetes.io/instance: argo-cd
      app.kubernetes.io/name: argocd-server-external
      app.kubernetes.io/part-of: argocd
      app.kubernetes.io/version: v2.8.4
    name: argocd-server-external
  spec:
    ports:
    - name: https
      port: 443
      protocol: TCP
      targetPort: 8080
      nodePort: 30443
    selector:
      app.kubernetes.io/instance: argo-cd
      app.kubernetes.io/name: argocd-server
    type: NodePort
  ```
      {{% /tab%}}
    {{< /tabs >}}
  {{< /tab >}}

  {{< tab title="File/URL" style="default" color="darkorchid" >}}
      {{< tabs groupid="tabs-example-language" >}}
      {{% tab title="yaml" %}}
  ```yaml
  apiVersion: v1
  kind: Service
  metadata:
    labels:
      app.kubernetes.io/component: server
      app.kubernetes.io/instance: argo-cd
      app.kubernetes.io/name: argocd-server-external
      app.kubernetes.io/part-of: argocd
      app.kubernetes.io/version: v2.8.4
    name: argocd-server-external
  spec:
    ports:
    - name: https
      port: 443
      protocol: TCP
      targetPort: 8080
      nodePort: 30443
    selector:
      app.kubernetes.io/name: argocd-server
    type: NodePort
  ```
      {{% /tab%}}
    {{< /tabs >}}
  {{< /tab >}}
{{< /tabs >}}


### 5. create external service
```shell
kubectl -n argocd apply -f argocd-server-external.yaml
```

### 6. get argocd initialized password
```shell
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

### 7. login argocd

{{< tabs >}}
{{% tab title="argocd-cli" %}}
```shell
ARGOCD_PASS=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)
MASTER_IP=$(kubectl get nodes --selector=node-role.kubernetes.io/control-plane -o jsonpath='{$.items[0].status.addresses[?(@.type=="InternalIP")].address}')
argocd login --insecure --username admin $MASTER_IP:30443 --password $ARGOCD_PASS
```
{{% /tab  %}}

{{% tab title="web browser" %}}
```text
open https://<$local_ip:localhost>:30443
```
{{% /tab  %}}
{{< /tabs >}}