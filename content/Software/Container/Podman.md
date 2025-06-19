+++
tags = ["Podman"]
title = 'Install Podman'
date = 2025-03-07T15:00:59+08:00
weight = 160
+++


### Reference
- you can directly  install docker engine from 🐳[docker official website](https://docs.docker.com/engine/install/).


### Installation

> [!CAUTION]
> If you already have something wrong with `apt update`, please check the following 🔗[link](), adding docker source wont help you to solve that problem.

{{< tabs style="transparent" >}}
{{% tab title="fedora" %}}
```shell
sudo dnf update -y 
sudo dnf -y install podman
```

{{% /tab %}}
{{% tab title="centos" %}}
```shell
sudo yum install -y podman
```

{{% /tab %}}
{{% tab title="ubuntu✅" %}}

```shell
sudo apt-get update
sudo apt-get -y install podman
```

{{% /tab %}}
{{% tab title="Mac OS" %}}
visit [https://www.docker.com/products/docker-desktop ](https://www.docker.com/products/docker-desktop )
{{% /tab %}}

{{< /tabs >}}


### Run Params
start an container
```shell
podman run [params]
```
`-rm`: delete if failed 

`-v`: load a volume

### Example
```shell
podman run --rm\
      -v /root/kserve/iris-input.json:/tmp/iris-input.json \
      --privileged \
     -e MODEL_NAME=sklearn-iris \
     -e INPUT_PATH=/tmp/iris-input.json \
     -e SERVICE_HOSTNAME=sklearn-iris.kserve-test.example.com \
      -it m.daocloud.io/docker.io/library/golang:1.22  sh -c "command A; command B; exec bash"
```