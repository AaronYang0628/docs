+++
title = 'Docker'
date = 2024-03-07T15:00:59+08:00
weight = 1
+++

### Installation
{{< tabs >}}
{{% tab title="fedora" %}}
```shell
sudo dnf update -y 
sudo dnf config-manager --add-repo=https://download.docker.com/linux/fedora/docker-ce.repo
sudo dnf install docker-ce docker-ce-cli containerd.io 
```
Once the installation is complete, start the Docker service

```shell
sudo systemctl start docker
```

{{% /tab %}}
{{% tab title="centos" %}}
```shell
sudo yum install -y yum-utils \
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo 
sudo yum install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```
Once the installation is complete, start the Docker service
```shell
sudo systemctl start docker
```

{{% /tab %}}
{{% tab title="ubuntu" %}}
```shell
sudo apt-get -y install podman
```
{{% /tab %}}
{{< /tabs >}}


