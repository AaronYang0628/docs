+++
tags = ["NFS"]
title = 'Install NFS'
date = 2025-03-07T15:00:59+08:00
weight = 140
+++


### Installation

{{< tabs groupid="nfs" style="primary" title="Install By" icon="thumbtack" >}}

{{< tab title="Helm" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  2. Helm has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>


{{< /tab >}}

{{< tab title="ArgoCD" style="transparent">}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  2. argoCD has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  3. ingres has installed on argoCD, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>

  <p> <b>1.prepare `nfs-provisioner.yaml` </b></p> 

  {{% notice style="transparent" %}}
  ```yaml
  apiVersion: argoproj.io/v1alpha1
  kind: Application
  metadata:
    name: nfs-provisioner
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
        releaseName: nfs-provisioner
        values: |
          image:
            repository: m.daocloud.io/registry.k8s.io/sig-storage/nfs-subdir-external-provisioner
            pullPolicy: IfNotPresent
          nfs:
            server: nfs.services.test
            path: /
            mountOptions:
              - vers=4
              - minorversion=0
              - rsize=1048576
              - wsize=1048576
              - hard
              - timeo=600
              - retrans=2
              - noresvport
            volumeName: nfs-subdir-external-provisioner-nas
            reclaimPolicy: Retain
          storageClass:
            create: true
            defaultClass: true
            name: nfs-external-nas
    destination:
      server: https://kubernetes.default.svc
      namespace: storage
  ```
  {{% /notice %}}


  <p> <b>3.deploy mariadb </b></p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl -n argocd apply -f nfs-provisioner.yaml
  ```
  {{% /notice %}}

  <p> <b>4.sync by argocd </b></p>

  {{% notice style="transparent" %}}
  ```bash
  argocd app sync argocd/nfs-provisioner
  ```
  {{% /notice %}}

{{< /tab >}}


{{< tab title="Docker" style="transparent">}}
  <p> <b>Preliminary </b></p>
  1. Docker has installed, if not check 🔗<a href="docs/software/container/docker/index.html" target="_blank">link</a> </p></br>

{{% notice style="important" title="Using Proxy" %}} 
  you can run an addinational **daocloud** image to accelerate your pulling, check [Daocloud Proxy](daocloud/index.html)
  {{% /notice %}}

  <p> <b>1.init server </b></p>

  {{% notice style="transparent" %}}
  ```bash
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
  {{% /notice %}}

{{< /tab >}}

{{< tab title="Linux" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. centos yum repo source has updated, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  2.  

  <p> <b>1.install nfs util </b></p>

  {{< tabs groupid="111" >}}
    {{% tab title="centos" %}}
  ```bash
  sudo apt update -y
  sudo apt-get install nfs-common
  ```
    {{% /tab %}}

    {{% tab title="fedora" %}}
  ```bash
  dnf update -y
  dnf install -y nfs-utils rpcbindn
  ```
    {{% /tab %}}

    {{% tab title="ubuntu" %}}
  ```bash
  sudo apt update -y
  sudo apt-get install nfs-common
  ```
    {{% /tab %}}

  {{< /tabs >}}


  <p> <b>2. create share folder </b></p>

  {{% notice style="transparent" %}}
  ```bash
  mkdir /data && chmod 755 /data
  ```
  {{% /notice %}}

  <p> <b>3.edit `/etc/exports` </b></p>

  {{% notice style="transparent" %}}
  ```bash
  /data *(rw,sync,insecure,no_root_squash,no_subtree_check)
  ```
  {{% /notice %}}


  <p> <b>4.start nfs server </b></p>

  {{% notice style="transparent" %}}
  ```bash
  systemctl enable rpcbind
  systemctl enable nfs-server
  systemctl start rpcbind
  systemctl start nfs-server
  ```
  {{% /notice %}}


  <p> <b>5.test load on localhost </b></p>

  {{% notice style="transparent" %}}
  ```bash
  showmount -e localhost
  ```
  {{% /notice %}}

  {{% notice style="tip" title="Expectd Output" icon="check" expanded="false"%}}
  ```plaintext
  Export list for localhost:
  /data *
  ```
  {{% /notice %}}

  <p> <b>6.test load on other ip </b></p>

  {{% notice style="transparent" %}}
  ```bash
  showmount -e 192.168.aa.bb
  ```
  {{% /notice %}}

  {{% notice style="tip" title="Expectd Output" icon="check" expanded="false"%}}
  ```plaintext
  Export list for localhost:
  /data *
  ```
  {{% /notice %}}


  <p> <b>7.mount nfs disk </b></p>

  {{% notice style="transparent" %}}
  ```bash
  mkdir -p $(pwd)/mnt/nfs
  sudo mount -v 192.168.aa.bb:/data $(pwd)/mnt/nfs  -o proto=tcp -o nolock
  ```
  {{% /notice %}}

  <p> <b>8.set nfs auto mount </b></p>

  {{% notice style="transparent" %}}
  ```bash
  echo "192.168.aa.bb:/data /data nfs rw,auto,nofail,noatime,nolock,intr,tcp,actimeo=1800 0 0" >> /etc/fstab
  df -h
  ```
  {{% /notice %}}

{{< /tab >}}



{{< /tabs >}}

### Notes

##### [[Optional]]() create new partition
{{< tabs title="disk size:" >}}
{{% tab title="< 2TB" %}}
```shell
fdisk /dev/vdb

# n
# p
# w
```

{{% /tab %}}
{{% tab title="\>2TB" %}}
```shell
parted

#select /dev/vdb 
#mklabel gpt 
#mkpart primary 0 -1
#Cancel
#mkpart primary 0% 100%
#print
```

{{% /tab %}}
{{< /tabs >}}

##### [[Optional]]()Format disk
```shell
mkfs.xfs /dev/vdb1 -f
```

##### [[Optional]]() mount disk to folder
```shell
mount /dev/vdb1 /data
```

##### [[Optional]]() mount when restart
```shell
#vim `/etc/fstab` 
/dev/vdb1     /data  xfs   defaults   0 0
```
![fstab](../assets/fstab.png)


### FAQ

{{% expand title="Q1: Show me almost **endless** possibilities" %}}
You can add standard markdown syntax:

- multiple paragraphs
- bullet point lists
- _emphasized_, **bold** and even **_bold emphasized_** text
- [links](https://example.com)
- etc.

```plaintext
...and even source code
```

> the possibilities are endless (almost - including other shortcodes may or may not work)
{{% /expand %}}


{{% expand title="Q2: Show me almost **endless** possibilities" %}}
You can add standard markdown syntax:

- multiple paragraphs
- bullet point lists
- _emphasized_, **bold** and even **_bold emphasized_** text
- [links](https://example.com)
- etc.

```plaintext
...and even source code
```

> the possibilities are endless (almost - including other shortcodes may or may not work)
{{% /expand %}}