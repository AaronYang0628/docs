+++
title = 'Init Clickhouse NFS Server'
date = 2024-03-07T15:00:59+08:00
weight = 1
+++

### 1.  create new partition

```shell
parted

#select /dev/vdb 
#mklabel gpt 
#mkpart primary 0 -1
#Cancel
#mkpart primary 0% 100%
#print
```

### 2. Format disk
```shell
mkfs.xfs /dev/vdb1 -f
```

### 3. mount disk to folder
```shell
mount /dev/vdb1 /data
```

### 4.  mount when restart
```shell
#vim `/etc/fstab` 
/dev/vdb1     /data  xfs   defaults   0 0
```
![fstab](../asset/fstab.png)

### 5. init NFSv4 Server
```shell
echo -e "nfs\nnfsd" > /etc/modules-load.d/nfs4.conf
modprobe nfs && modprobe nfsd
mkdir -p $(pwd)/data/nfs/data
echo '/data *(rw,fsid=0,no_subtree_check,insecure,no_root_squash)' > $(pwd)/data/nfs/exports
podman run \
    --name nfs4 \
    --rm \
    --privileged \
    -p 12049:2049 \
    -v $(pwd)/data/nfs/data:/data \
    -v $(pwd)/data/nfs/exports:/etc/exports:ro \
    -d docker.io/erichough/nfs-server:2.2.1
```

{{% notice style="tip" %}}
you can run an addinational **daocloud** image to accelerate your pulling, check [Daocloud Proxy](daocloud/index.html)
{{% /notice %}}

### 6. [[Optional]]() test load
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
sudo mount -t nfs4 -o port=2049 -v localhost:/ $(pwd)/mnt/nfs
df -h
```

### 7.create NFS provisioner
prepare `csst-ck-nfs-provisioner.yaml`
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: csst-ck-nfs-provisioner
spec:
  syncPolicy:
    syncOptions:
    - CreateNamespace=true
  project: default
  source:
    repoURL: https://kubernetes-sigs.github.io/nfs-subdir-external-provisioner
    chart: nfs-subdir-external-provisioner
    targetRevision: 4.0.18
    helm:
      releaseName: csst-ck-nfs-provisioner
      values: |
        image:
          repository: m.daocloud.io/registry.k8s.io/sig-storage/nfs-subdir-external-provisioner
          pullPolicy: IfNotPresent
        nfs:
          server: <$nfs.service.ip.addr>
          path: /
          mountOptions:
            - port=12049
            - vers=4
            - minorversion=0
            - rsize=1048576
            - wsize=1048576
            - hard
            - timeo=600
            - retrans=2
            - noresvport
          volumeName: csst-ck-nfs-subdir-external-provisioner-nas
          reclaimPolicy: Retain
        storageClass:
          create: true
          defaultClass: true
          name: csst-nfs-external-nas        
  destination:
    server: https://kubernetes.default.svc
    namespace: basic-components
```

### 8. apply to k8s
```shell
kubectl -n argocd apply -f csst-ck-nfs-provisioner.yaml
```

### 9. sync by argocd
```shell
argocd app sync argocd/csst-ck-nfs-provisioner
```

Then you can use storage class `csst-nfs-external-nas` to create `pv` or `pvc`