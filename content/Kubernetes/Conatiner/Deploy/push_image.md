+++
title = 'Push Image'
date = 2024-03-27T19:58:45+08:00
weight = 1
+++

### Preliminary
- install [docker](kubernetes/conatiner/docker/index.html) or [podman](kubernetes/conatiner/podman/index.html) first

### 1. save image to local FS
```shell
docker save -o <$dim_file_path>
```
{{% expand title="for example"%}}
```yaml
docker save -o xxxx:<$tag>
```
{{% /expand %}}


### 2. image load
```shell
docker load -i <$dim_file_path>
```
{{% expand title="for example"%}}
```yaml
docker load -i <$dim_file_path>
```
{{% /expand %}}

### 3. tag your image

{{< tabs groupid="a" >}}
{{% tab title="docker" %}}
```shell
docker tag <$image_id> cr.registry.res.cloud.wuxi-yqgcy.cn/mirror/csst-msc-l1-mbi:<$version>
```
{{% /tab %}}
{{% tab title="podman" %}}
```shell
podman tag <$image_id> cr.registry.res.cloud.wuxi-yqgcy.cn/mirror/financial-topic:<$version>
```
{{% /tab %}}
{{< /tabs >}}


### 4. docker login
{{< tabs groupid="a" >}}
{{% tab title="docker" %}}
```shell
docker login --username=ascm-org-1705656754517 cr.registry.res.cloud.wuxi-yqgcy.cn
```
{{% /tab %}}
{{% tab title="podman" %}}
```shell
podman login --username=ascm-org-1705656754517 cr.registry.res.cloud.wuxi-yqgcy.cn --tls-verify=false
```
{{% /tab %}}
{{< /tabs >}}

you can send `-p "XXXXX"` passing the pwd directly.
```shell
docker login --username=ascm-org-1710208820455 cr.registry.res.cloud.zhejianglab.com -p 'AmViUxcYM3regk15'
```

{{% expand title="failed to verify certificate: x509"%}}
```yaml
sudo vim /etc/docker/daemon.json
```
And then add `insecure-registries` in that file
```json
{  
   "insecure-registries":["some url"]
}
```
Finally, restart docker service
```shell
sudo systemctl restart docker
```
{{% /expand %}}

### 5. docker push

{{< tabs groupid="a" >}}
{{% tab title="docker" %}}
```shell
docker push cr.registry.res.cloud.wuxi-yqgcy.cn/mirror/csst-msc-l1-mbi:<$version>
```
{{% /tab %}}
{{% tab title="podman" %}}
```shell
podman push cr.registry.res.cloud.wuxi-yqgcy.cn/mirror/financial-topic:<$version> --tls-verify=false
```
{{% /tab %}}
{{< /tabs >}}