+++
title = 'Kubernetes'
date = 2024-03-08T11:16:18+08:00
+++

### 1. create resource

{{< tabs >}}
{{% tab title="from file" %}}
```shell
kubectl create -n <$namespace> -f <$file_url>
```
{{% /tab %}}
{{% tab title="from helm" %}}
```bash
echo "Hello World!"
```
{{% /tab %}}
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