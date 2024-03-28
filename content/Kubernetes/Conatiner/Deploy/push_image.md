+++
title = 'Push Image'
date = 2024-03-27T19:58:45+08:00
weight = 1
+++

### Preliminary
- you might need to login docker first
```shell
docker login --username=chenhuaxi@1474205656754650 cr.registry.res.cloud.wuxi-yqgcy.cn
```

### 1. save image to local FS
```shell
docker save -o <$dim_file_path>
```
{{% expand title="for example"%}}
```yaml
persistence:
  storageClass: "alicloud-disk-topology-alltype"
  accessModes:
    - ReadWriteMany
  size: 20Gi
```
{{% /expand %}}


### 2. image load
```shell
docker load -i <$dim_file_path>
```
{{% expand title="for example"%}}
```yaml
persistence:
  storageClass: "alicloud-disk-topology-alltype"
  accessModes:
    - ReadWriteMany
  size: 20Gi
```
{{% /expand %}}

### 3. tag your image
```shell
docker tag <$image_id> cr.registry.res.cloud.wuxi-yqgcy.cn/mirror/csst-msc-l1-mbi:<$version>
```

### 4. docker login
```shell
docker login --username=ascm-org-1705656754517 cr.registry.res.cloud.wuxi-yqgcy.cn
```

#### 5. docker push
```shell
docker push cr.registry.res.cloud.wuxi-yqgcy.cn/mirror/csst-msc-l1-mbi:<$version>
```