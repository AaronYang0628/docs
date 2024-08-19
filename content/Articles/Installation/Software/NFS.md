+++
title = 'NFS Server'
date = 2024-03-07T15:00:59+08:00
weight = 8
+++

### 1. install server
```shell
yum install -y nfs-utils rpcbind
```
### 2. create share dir
```shell
mkdir /data && chmod 755 /data
```
### 3. edit /etc/exports
```shell
/data *(rw,sync,insecure,no_root_squash,no_subtree_check)
```
### 4. start server
```shell
systemctl enable rpcbind
systemctl enable nfs-server
systemctl start rpcbind
systemctl start nfs-server
```

### 5. test client
```shell
showmount -e localhost

#Export list for localhost:
#/data *
```

### 6. test load
> assume nfs server is 192.168.aa.bb

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

check available nfs
```shell
showmount -e 192.168.aa.bb

#Export list for localhost:
#/data *
```
```shell
mkdir -p $(pwd)/mnt/nfs
sudo mount -v 192.168.aa.bb:/data $(pwd)/mnt/nfs  -o proto=tcp -o nolock

# set nfs auto mount
echo "192.168.aa.bb:/data /data nfs rw,auto,nofail,noatime,nolock,intr,tcp,actimeo=1800 0 0" >> /etc/fstab
df -h
```

