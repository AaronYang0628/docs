+++
title = 'Minikube'
date = 2024-03-07T15:00:59+08:00
weight = 130
+++

### Preliminary
- Minikube binary has installed, if not check 🔗[link](Installation/binary/minikube/index.html)
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
minikube start --driver=podman  --image-mirror-country=cn --kubernetes-version=v1.33.1 --image-repository=registry.cn-hangzhou.aliyuncs.com/google_containers --cpus=6 --memory=20g --disk-size=50g --force
```

### Restart minikube
```shell
minikube stop && minikube start
```
### Add alias
```shell
alias kubectl="minikube kubectl --"
```

### Stop And Clean
```shell
minikube stop && minikube delete --all --purge
```

### Forward 
```shell
# execute on your local machine
        Remote                                                  Local⬇️
   __________________                          ________________________________   
  ╱                  ╲╲      wire/wifi        ╱ [ Minikube ] 17.100.x.y        ╲╲
 ╱                   ╱╱   <------------->    ╱                                 ╱╱
╱ telnet 192.168.a.b ╱                      ╱  > execute ssh... at 192.168.a.b ╱ 
╲___________________╱  IP: 10.45.m.n        ╲_________________________________╱ IP: 192.168.a.b
```               
```shell
ssh -i ~/.minikube/machines/minikube/id_rsa docker@$(minikube ip) -L '*:30443:0.0.0.0:30443' -N -f
```

and then you can visit [https://minikube.sigs.k8s.io/docs/start/](https://minikube.sigs.k8s.io/docs/start/) for more detail.


### FAQ

{{% expand title="Q1: couldn't get resource list for external.metrics.k8s.io/v1beta1: the server is currently unable to handle..." %}}

通常是由于 Metrics Server 未正确安装 或 External Metrics API 缺失 导致的

```shell
# 启用 Minikube 的 metrics-server 插件
minikube addons enable metrics-server

# 等待部署完成（约 1-2 分钟）
kubectl wait --for=condition=available deployment/metrics-server -n kube-system --timeout=180s

# 验证 Metrics Server 是否运行
kubectl -n kube-system get pods  | grep metrics-server
```

> the possibilities are endless (almost - including other shortcodes may or may not work)
{{% /expand %}}


{{% expand title="Q2: Export minikube to local directly" %}}

```shell
minikube start --driver=podman  --image-mirror-country=cn --kubernetes-version=v1.33.1 --image-repository=registry.cn-hangzhou.aliyuncs.com/google_containers  --listen-address=0.0.0.0 --cpus=6 --memory=20g --disk-size=100g --force
```
{{% /expand %}}