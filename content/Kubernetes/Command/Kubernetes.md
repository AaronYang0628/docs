+++
title = 'CheatSheet'
date = 2024-03-08T11:16:18+08:00
+++

### 1. create resource
{{< tabs groupid="main" style="primary" title="Resource From" icon="thumbtack" >}}
{{< tab title = "File" >}}
  {{< tabs groupid="tabs-resource" >}}
  {{% tab title="bash" %}}
  ```bash
    kubectl create -n <$namespace> -f <$file_url>
  ```
  {{% /tab %}}
  {{< /tabs >}}

  {{% expand title="temp-file.yaml"%}}
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
  {{% /expand %}}
{{< /tab >}}

{{< tab title="Helm Chart" style="default" color="darkorchid" >}}
   {{< tabs groupid="tabs-resource" >}}
  {{% tab title="helm" %}}
  ```bash
    helm install <$resource_id> <$resource_id> \
        --namespace <$namespace> \
        --create-namespace \
        --version 5.46.7 \
        --repo <$repo_url> \
        --values resource.values.yaml \
        --atomic
  ```
  {{% /tab %}}
  {{< /tabs >}}

    {{% expand title="resource.values.yaml"%}}
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
    {{% /expand %}}
{{< /tab >}}
{{< /tabs >}}


### 2. debug resource
```shell
kubectl -n <$namespace> describe <$resource_id>
```

### 3. logging
```shell
kubectl logs -n <$namespace> -f <$resource_id>
```

### 4. port forwarding
```shell
kubectl port-forward  <$resource_id> --address 0.0.0.0 8080:80 # local:pod
```

### 5. extract by json path
```shell
kubectl get nodes -o jsonpath='{.items[*].spec.podCIDR}'
```

### 6. delete all resource under specific namespace
```shell
kubectl delete all --all -n <$namespace>
```
{{% expand title="if you wannna delete all"%}}
```shell
kubectl delete all --all --all-namespaces
```
{{% /expand %}}

### 7. Opening a Bash Shell inside a Pod 
```shell
kubectl exec -it <pod-ID> -n <MI-namespace> bash  
```