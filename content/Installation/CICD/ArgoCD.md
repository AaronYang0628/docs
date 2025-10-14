+++
title = 'Install Argo CD'
date = 2024-03-07T15:00:59+08:00
weight = 10
+++

### Preliminary
- Kubernets has installed, if not check 🔗[link](kubernetes/cluster/index.html)
- Helm binary has installed, if not check 🔗[link](Installation/binary/helm/index.html)



### 1. install argoCD binary

{{% include file="Content\Installation\Binary\argocd.md" %}}

### 2. install components

{{< tabs groupid="argocd" style="primary" title="Install By" icon="thumbtack" >}}
{{< tab title="Helm" >}}
  <b>1. Prepare argocd.values.yaml</b><br/>
  {{< tabs groupid="tabs-example-language" >}}
    {{% tab title="`argocd.values.yaml`" %}}
    crds:
      install: true
      keep: false
    global:
      domain: argo-cd.ay.dev
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
    server:
      ingress:
        enabled: true
        ingressClassName: nginx
        annotations:
          nginx.ingress.kubernetes.io/ssl-passthrough: "true"
          cert-manager.io/cluster-issuer: self-signed-ca-issuer
          nginx.ingress.kubernetes.io/backend-protocol: HTTPS
        hostname: argo-cd.ay.dev
        path: /
        pathType: Prefix
        tls: true
    {{% /tab%}}
  {{< /tabs >}}

  <b>2. Install argoCD </b><br/>

  {{< tabs groupid="tabs-example-language" >}}
    {{% tab title="ay mirror" %}}

    helm upgrade --install argo-cd argo-cd \
      --namespace argocd \
      --create-namespace \
      --version 8.3.5 \
      --repo https://aaronyang0628.github.io/helm-chart-mirror/charts \
      --values argocd.values.yaml \
      --atomic

    {{% /tab%}}

    {{% tab title="original" %}}

    helm install argo-cd argo-cd \
      --namespace argocd \
      --create-namespace \
      --version 8.3.5 \
      --repo https://argoproj.github.io/argo-helm \
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
  kubectl -n argocd apply -f - <<EOF
  apiVersion: v1
  kind: Service
  metadata:
    labels:
      app.kubernetes.io/component: server
      app.kubernetes.io/instance: argo-cd
      app.kubernetes.io/name: argocd-server-external
      app.kubernetes.io/part-of: argocd
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
  EOF
  ```
      {{% /tab%}}
    {{< /tabs >}}
  {{< /tab >}}

  {{< tab title="File/URL" style="default" color="darkorchid" >}}
      {{< tabs groupid="tabs-example-language" >}}
      {{% tab title="yaml" %}}
  ```yaml
  kubectl -n argocd apply -f - <<EOF
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
  EOF
  ```
      {{% /tab%}}
    {{< /tabs >}}
  {{< /tab >}}
{{< /tabs >}}


### 5. create external service
```shell
kubectl -n argocd apply -f argocd-server-external.yaml
```



### 6. [[Optional]]() prepare `argocd-server-ingress.yaml`

Before you create ingress, you need to create cert-manager and cert-issuer `self-signed-ca-issuer`, if not, please check 🔗[link](Installation/networking/cert_manager.html)

{{< tabs groupid="argocd" style="primary" title="Install By" icon="thumbtack" >}}
  {{< tab title="Helm" >}}
    {{< tabs groupid="tabs-example-language" >}}
      {{% tab title="yaml" %}}
  ```yaml
  kubectl -n argocd apply -f - <<EOF
  apiVersion: networking.k8s.io/v1
  kind: Ingress
  metadata:
    annotations:
      cert-manager.io/cluster-issuer: self-signed-ca-issuer
      nginx.ingress.kubernetes.io/backend-protocol: HTTPS
      nginx.ingress.kubernetes.io/ssl-passthrough: "true"
    name: argo-cd-argocd-server
    namespace: argocd
  spec:
    ingressClassName: nginx
    rules:
    - host: argo-cd.ay.dev
      http:
        paths:
        - backend:
            service:
              name: argo-cd-argocd-server
              port:
                number: 443
          path: /
          pathType: Prefix
    tls:
    - hosts:
      - argo-cd.ay.dev
      secretName: argo-cd.ay.dev-tls
  EOF
  ```
      {{% /tab%}}
    {{< /tabs >}}
  {{< /tab >}}

  {{< tab title="File/URL" style="default" color="darkorchid" >}}
      {{< tabs groupid="tabs-example-language" >}}
      {{% tab title="yaml" %}}
  ```yaml
  apiVersion: networking.k8s.io/v1
  kind: Ingress
  metadata:
    annotations:
      cert-manager.io/cluster-issuer: self-signed-ca-issuer
      nginx.ingress.kubernetes.io/backend-protocol: HTTPS
      nginx.ingress.kubernetes.io/ssl-passthrough: "true"
    name: argo-cd-argocd-server
    namespace: argocd
  spec:
    ingressClassName: nginx
    rules:
    - host: argo-cd.ay.dev
      http:
        paths:
        - backend:
            service:
              name: argo-cd-argocd-server
              port:
                number: 443
          path: /
          pathType: Prefix
    tls:
    - hosts:
      - argo-cd.ay.dev
      secretName: argo-cd.ay.dev-tls
  ```
      {{% /tab%}}
    {{< /tabs >}}
  {{< /tab >}}
{{< /tabs >}}


### 7. [[Optional]]() create external service
```shell
kubectl -n argocd apply -f argocd-server-external.yaml
```


### 8. get argocd initialized password
```shell
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

### 9. login argocd

{{< tabs >}}
{{% tab title="argocd-cli" %}}
```shell
ARGOCD_PASS=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)
MASTER_IP=$(kubectl get nodes --selector=node-role.kubernetes.io/control-plane -o jsonpath='{$.items[0].status.addresses[?(@.type=="InternalIP")].address}')
argocd login --insecure --username admin $MASTER_IP:30443 --password $ARGOCD_PASS
```
{{% /tab  %}}

{{% tab title="using port" %}}
if you deploy argocd in minikube, you might need to forward this port
```shell
ssh -i ~/.minikube/machines/minikube/id_rsa docker@$(minikube ip) -L '*:30443:0.0.0.0:30443' -N -f
```
```text
open https://$(minikube ip):30443
```
{{% /tab  %}}

{{% tab title="using ingress" %}}
if you use ingress, you might need to configure your browser to allow insecure connection
```shell
kubectl -n basic-components get secret root-secret -o jsonpath='{.data.tls\.crt}' | base64 -d > cert-manager-self-signed-ca-secret.crt
```
```text
open https://argo-cd.ay.dev
```
{{% /tab  %}}
{{< /tabs >}}