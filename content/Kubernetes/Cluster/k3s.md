+++
title = 'K3s'
date = 2024-03-07T15:00:59+08:00
weight = 112
+++


### Preliminary
- [Hardware Requirements](https://docs.k3s.io/installation/requirements?os=debian#hardware):

    1. Server need to have at least 2 cores, 2 GB RAM
    2. Agent need 1 core , 512 MB RAM

- Operating System:
    1. K3s is expected to work on most modern Linux systems.

- Network Requirements:
    1. The K3s server needs port 6443 to be accessible by all nodes.
    2. If you wish to utilize the metrics server, all nodes must be accessible to each other on port 10250.


### Init K3s Server [[At Server End]]()
```shell
curl -sfL https://rancher-mirror.rancher.cn/k3s/k3s-install.sh | INSTALL_K3S_MIRROR=cn sh -s - server --cluster-init --flannel-backend=vxlan --node-taint "node-role.kubernetes.io/control-plane=true:NoSchedule" --disable traefik
``` 
append `--disable traefik`

append `--disable servicelb` 禁用 ServiceLB（如果你计划使用其他负载均衡器如 MetalLB）

append `--disable local-storage` 禁用本地存储（如果你使用其他存储方案）

### Get K3s Token [[At Server End]]()
```shell
cat /var/lib/rancher/k3s/server/node-token
```

### Join K3s Worker [[At Agent End]]()
```shell

curl -sfL https://rancher-mirror.rancher.cn/k3s/k3s-install.sh | INSTALL_K3S_MIRROR=cn K3S_URL=https://<master-ip>:6443 K3S_TOKEN=<join-token> sh -
```

### Copy Kubeconfig [[At Server + Agent End]]()
```shell
mkdir -p $HOME/.kube
cp /etc/rancher/k3s/k3s.yaml $HOME/.kube/config
```

### How it works

<img src="../../../images/content/kubernetes/how-it-works-k3s-revised.svg" alt="k3s" width="900">

### Uninstall K3s cluster [[At Server + Agent End]]()
```shell
# exec on server
/usr/local/bin/k3s-uninstall.sh

# exec on agent 
/usr/local/bin/k3s-agent-uninstall.sh
```