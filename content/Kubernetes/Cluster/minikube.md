+++
title = 'Minikube'
date = 2024-03-07T15:00:59+08:00
weight = 130
+++

### Preliminary
- Minikube binary has installed, if not check 🔗[link](software/binary/minikube/index.html)
- Hardware Requirements:

    1. At least 2 GB of RAM per machine (minimum 1 GB)
    2. 2 CPUs on the master node
    3. Full network connectivity among all machines (public or private network)

- Operating System:
    1. Ubuntu 20.04/18.04, CentOS 7/8, or any other supported Linux distribution.

- Network Requirements:
    1. Unique hostname, MAC address, and product_uuid for each node.
    2. Certain ports need to be open (e.g., 6443, 2379-2380, 10250, 10251, 10252, 10255, etc.)


### [[Optional]]() Disable aegis service and reboot system for `Aliyun`

```shell
sudo systemctl disable aegis && sudo reboot
```

### Customize your cluster
```shell
minikube start --driver=podman --kubernetes-version=v1.27.10 --image-mirror-country=cn --image-repository=registry.cn-hangzhou.aliyuncs.com/google_containers --cpus=6 --memory=24g --disk-size=100g
```

### Restart minikube
```shell
minikube stop && minikube start
```
### Add alias
```shell
alias kubectl="minikube kubectl --"
```

### Forward
```shell
ssh -i ~/.minikube/machines/minikube/id_rsa docker@$(minikube ip) -L '*:30443:0.0.0.0:30443' -N -f
```

and then you can visit [https://minikube.sigs.k8s.io/docs/start/](https://minikube.sigs.k8s.io/docs/start/) for more detail.

