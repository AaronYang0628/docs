+++
title = 'Install Kubernetes'
date = 2024-03-07T15:00:59+08:00
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
{{% /tab %}}
{{% tab title="minkube" %}}
```xml
<Hello>World</Hello>
```
{{% /tab %}}
{{% tab title="normal" %}}
```properties
Hello = World
```
{{% /tab %}}
{{< /tabs >}}