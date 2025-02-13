+++
title = 'Quick Start'
date = 2024-03-07T15:00:59+08:00
weight = 1
+++

### Installation
```shell
# download kubebuilder and install locally.
curl -L -o kubebuilder "https://go.kubebuilder.io/dl/latest/$(go env GOOS)/$(go env GOARCH)"
chmod +x kubebuilder && sudo mv kubebuilder /usr/local/bin/
```

### Create A Project
```shell
mkdir -p ~/projects/guestbook
cd ~/projects/guestbook
kubebuilder init --domain my.domain --repo my.domain/guestbook
```
{{% expand title="Error: unable to scaffold with \"base.go.kubebuilder.io/v4\":exit status 1" %}}
**Just try again!**
```shell
rm -rf ~/projects/guestbook/*
kubebuilder init --domain my.domain --repo my.domain/guestbook
```
{{% /expand %}}

### Create An API
```shell
kubebuilder create api --group webapp --version v1 --kind Guestbook
```
{{% expand title="Error: unable to run post-scaffold tasks of \"base.go.kubebuilder.io/v4\": exec: \"make\": executable file not found in $PATH " %}}
```shell
apt-get -y install make
rm -rf ~/projects/guestbook/*
kubebuilder init --domain my.domain --repo my.domain/guestbook
kubebuilder create api --group webapp --version v1 --kind Guestbook
```
{{% /expand %}}

### Prepare a K8s Cluster

{{< tabs title="cluster in " >}}
{{% tab title="minikube" %}}
```shell
minikube start --kubernetes-version=v1.27.10 --image-mirror-country=cn --image-repository=registry.cn-hangzhou.aliyuncs.com/google_containers --cpus=4 --memory=4g --disk-size=50g --force
```

{{% /tab %}}

{{% tab title="ack" %}}


{{% /tab %}}

{{< /tabs >}}

```shell

```