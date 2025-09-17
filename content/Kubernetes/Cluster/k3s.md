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


### Init server
```shell
curl -sfL https://rancher-mirror.rancher.cn/k3s/k3s-install.sh | INSTALL_K3S_MIRROR=cn sh -s - server --cluster-init --flannel-backend=vxlan --node-taint "node-role.kubernetes.io/control-plane=true:NoSchedule"
```

### Get token
```shell
cat /var/lib/rancher/k3s/server/node-token
```

### Join worker
```shell

curl -sfL https://rancher-mirror.rancher.cn/k3s/k3s-install.sh | INSTALL_K3S_MIRROR=cn K3S_URL=https://<master-ip>:6443 K3S_TOKEN=<join-token> sh -
```

### Copy kubeconfig
```shell
mkdir -p $HOME/.kube
cp /etc/rancher/k3s/k3s.yaml $HOME/.kube/config
```

### Uninstall k3s
```shell
# exec on server
/usr/local/bin/k3s-uninstall.sh

# exec on agent 
/usr/local/bin/k3s-agent-uninstall.sh
```