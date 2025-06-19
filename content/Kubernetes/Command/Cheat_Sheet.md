+++
title = 'Kubectl CheatSheet'
date = 2024-03-08T11:16:18+08:00
weight = 1
+++

## Switch Context
- use different config
```shell
kubectl --kubeconfig /root/.kube/config_ack get pod
```

---

## Resource
- create resource
{{< tabs groupid="main" style="transparent" title="Resource From" icon="thumbtack" >}}
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

{{< tab title="Helm Chart" style="transparent" >}}
   {{< tabs groupid="tabs-resource" >}}
  {{% tab title="helm" %}}
  ```bash
    helm install <$resource_id> <$resource_id> \
        --namespace <$namespace> \
        --create-namespace \
        --version <$version> \
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


- debug resource
```shell
kubectl -n <$namespace> describe <$resource_id>
```

- logging resource
```shell
kubectl -n <$namespace> logs -f <$resource_id>
```

-  port forwarding resource
```shell
kubectl -n <$namespace> port-forward  <$resource_id> --address 0.0.0.0 8080:80 # local:pod
```

-  delete all resource under specific namespace
```shell
kubectl delete all --all -n <$namespace>
```
{{% expand title="if you wannna delete all"%}}
```shell
kubectl delete all --all --all-namespaces
```
{{% /expand %}}

-  delete error pods
```shell
kubectl -n <$namespace> delete pods --field-selector status.phase=Failed
```

-  force delete
```shell
kubectl -n <$namespace> delete pod <$resource_id> --force --grace-period=0
```

-  opening a Bash Shell inside a Pod 
```shell
kubectl -n <$namespace> exec -it <$resource_id> -- bash  
```

-  copy secret to another namespace
```shell
kubectl -n <$namespaceA> get secret <$secret_name> -o json \
    | jq 'del(.metadata["namespace","creationTimestamp","resourceVersion","selfLink","uid"])' \
    | kubectl -n <$namespaceB> apply -f -
```

-  copy secret to another name
```shell
kubectl -n <$namespace> get secret <$old_secret_name> -o json | \
jq 'del(.metadata["namespace","creationTimestamp","resourceVersion","selfLink","uid","ownerReferences","annotations","labels"]) | .metadata.name = "<$new_secret_name>"' | \
kubectl apply -n <$namespace> -f -
```

-  delete all completed job
```shell
kubectl delete jobs -n <$namespace> --field-selector status.successful=1 
```

## Nodes
-  add taint
```shell
kubectl taint nodes <$node_ip> <key:value>
```
{{% expand title="for example"%}}
```shell
kubectl taint nodes node1 dedicated:NoSchedule
```
{{% /expand %}}
-  remove taint
```shell
kubectl remove taint
```
{{% expand title="for example"%}}
```shell
kubectl taint nodes node1 dedicated:NoSchedule-
```
{{% /expand %}}

-  show info extract by json path
```shell
kubectl get nodes -o jsonpath='{.items[*].spec.podCIDR}'
```

## Deploy
-  rollout
show rollout history
```shell
kubectl -n <$namespace> rollout history deploy/<$deploy_resource_id>
```

undo rollout
```shell
kubectl -n <$namespace> rollout undo deploy <$deploy_resource_id>  --to-revision=1
```