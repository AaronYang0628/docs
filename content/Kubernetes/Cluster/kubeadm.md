+++
title = 'KubeAdm'
date = 2025-02-07T15:00:59+08:00
weight = 113
draft = true
+++

### Preliminary
- Minikube has installed, if not [check link](kubernetes/command/install/index.html)


#### [[Optional]]() disable aegis service and reboot system for `Aliyun`

```shell
sudo systemctl disable aegis && sudo reboot
```

#### [[Optional]]() customize your cluster
```shell
minikube start --kubernetes-version=v1.27.10 --image-mirror-country=cn --image-repository=registry.cn-hangzhou.aliyuncs.com/google_containers --cpus=6 --memory=24g --disk-size=100g
```
{{% expand title="If you wanna use podman ..." %}}
minikube start --driver=podman ...
```shell
minikube start --driver=podman --kubernetes-version=v1.27.10 --image-mirror-country=cn --image-repository=registry.cn-hangzhou.aliyuncs.com/google_containers --cpus=6 --memory=24g --disk-size=100g
```
{{% /expand %}}

#### [[Optional]]() restart minikube
```shell
minikube stop && minikube start
```
#### Add alias
```shell
alias kubectl="minikube kubectl --"
```

#### Forward
```shell
ssh -i ~/.minikube/machines/minikube/id_rsa docker@$(minikube ip) -L '*:30443:0.0.0.0:30443' -N -f
```

and then you can visit [https://minikube.sigs.k8s.io/docs/start/](https://minikube.sigs.k8s.io/docs/start/) for more detail.

