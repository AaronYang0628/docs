+++
title = 'Argo CD'
date = 2024-03-07T15:00:59+08:00
+++

### Preliminary
- Kubernets has installed
- Helm binary is working

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

### 2. prepare `argocd.values.yaml`

```yaml
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

```

### 3. install argoCD 

{{< tabs >}}
{{% tab title="helm" %}}
```shell
helm install argo-cd argo-cd \
    --namespace argocd \
    --create-namespace \
    --version 5.46.7 \
    --repo https://ben-wangz.github.io/helm-chart-mirror/charts \
    --values argocd.values.yaml \
    --atomic
```
{{% /tab %}}
{{% tab title="file url" %}}
```shell
kubectl apply -n argocd -f argocd.values.yaml
```
{{% /tab %}}

{{< /tabs >}}

### 4. prepare `argocd-server-external.yaml`
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
argocd login --insecure --username admin localhost:30443
```
{{% /tab  %}}

{{% tab title="web browser" %}}
```text
open https://<$ip:localhost>:30443
```
{{% /tab  %}}
{{< /tabs >}}