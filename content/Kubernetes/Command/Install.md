+++
title = 'Install Kubernetes'
date = 2024-03-07T15:00:59+08:00
weight = 2
+++

There are many ways to build a kubernetes cluster.

### Install Kuberctl
```shell
MIRROR="files.m.daocloud.io/"
VERSION=$(curl -L -s https://${MIRROR}dl.k8s.io/release/stable.txt)
[ $(uname -m) = x86_64 ] && curl -sSLo kubectl "https://${MIRROR}dl.k8s.io/release/${VERSION}/bin/linux/amd64/kubectl"
[ $(uname -m) = aarch64 ] && curl -sSLo kubectl "https://${MIRROR}dl.k8s.io/release/${VERSION}/bin/linux/arm64/kubectl"
chmod u+x kubectl
mkdir -p ${HOME}/bin
mv -f kubectl ${HOME}/bin
```


### Build Cluster

{{< tabs groupid="install" >}}
{{% tab title="kind" %}}
```shell
MIRROR="files.m.daocloud.io/"
VERSION=v0.20.0
[ $(uname -m) = x86_64 ] && curl -sSLo kind "https://${MIRROR}github.com/kubernetes-sigs/kind/releases/download/${VERSION}/kind-linux-amd64"
[ $(uname -m) = aarch64 ] && curl -sSLo kind "https://${MIRROR}github.com/kubernetes-sigs/kind/releases/download/${VERSION}/kind-linux-arm64"
chmod u+x kind
mkdir -p ${HOME}/bin
mv -f kind ${HOME}/bin
```
Creating a Kubernetes cluster is as simple as `kind create cluster`
```shell
kind create cluster --name test
```
and the you can visit [https://kind.sigs.k8s.io/docs/user/quick-start/](https://kind.sigs.k8s.io/docs/user/quick-start/) for mode detail.
{{% /tab %}}
{{% tab title="minkube" %}}
```shell
[ $(uname -m) = x86_64 ] && curl -sSLo minikube "https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64"
[ $(uname -m) = aarch64 ] && curl -sSLo kubectl "https://storage.googleapis.com/minikube/releases/latest/minikube-linux-arm64"
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube /usr/local/bin/minikube
```
after you download binary, you can start your cluster
```shell
minikube start --kubernetes-version=v1.27.10 --image-mirror-country=cn --image-repository=registry.cn-hangzhou.aliyuncs.com/google_containers --cpus=6 --memory=24g --disk-size=100g
```

and then you can visit [https://minikube.sigs.k8s.io/docs/start/](https://minikube.sigs.k8s.io/docs/start/) for more detail.

{{% /tab %}}
{{% tab title="normal" %}}
```shell
yum -y install kubelet kubeadm kubectl
```
```shell
kubeadm init --kubernets-version=xxxxx
```
This might need to write a new article.[TODO]
{{% /tab %}}
{{< /tabs >}}