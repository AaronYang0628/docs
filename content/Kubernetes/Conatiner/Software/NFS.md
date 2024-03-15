+++
title = 'NFS'
date = 2024-03-07T15:00:59+08:00
weight = 8
+++


### 1. init NFSv4 (for su)
```shell
echo -e "nfs\nnfsd" > /etc/modules-load.d/nfs4.conf
modprobe nfs && modprobe nfsd
mkdir -p $(pwd)/data/nfs/data
echo '/data *(rw,fsid=0,no_subtree_check,insecure,no_root_squash)' > $(pwd)/data/nfs/exports
podman run \
    --name nfs4 \
    --rm \
    --privileged \
    -p 2049:2049 \
    -v $(pwd)/data/nfs/data:/data \
    -v $(pwd)/data/nfs/exports:/etc/exports:ro \
    -d docker.io/erichough/nfs-server:2.2.1
```

{{% notice style="tip" %}}
you can run an addinational **daocloud** image to accelerate your pulling, check [Daocloud Proxy](daocloud/index.html)
{{% /notice %}}

### 2. test load
{{< tabs title="install nfs on " >}}
{{% tab title="centos" %}}
```shell
sudo yum install -y nfs-utils
```
{{% /tab %}}
{{% tab title="ubuntu" %}}
```shell
sudo apt-get install nfs-common
```
{{% /tab %}}
{{% tab title="fedora" %}}
```shell
sudo dnf install -y nfs-utils
```
{{% /tab %}}
{{< /tabs >}}

client is ok for normal user
```shell
mkdir -p $(pwd)/mnt/nfs
sudo mount -t nfs4 -v localhost:/ $(pwd)/mnt/nfs
df -h
```

