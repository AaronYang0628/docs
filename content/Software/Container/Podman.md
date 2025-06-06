+++
tags = ["Podman"]
title = 'Install Podman'
date = 2025-03-07T15:00:59+08:00
weight = 2
+++


### Reference
- you can directly  install docker engine from 🐳[docker official website](https://docs.docker.com/engine/install/).


### Installation

> [!CAUTION]
> If you already have something wrong with `apt update`, please check the following 🔗[link](), adding docker source wont help you to solve that problem.

{{< tabs >}}
{{% tab title="fedora" %}}
```shell
sudo dnf update -y 
sudo dnf config-manager --add-repo=https://download.docker.com/linux/fedora/docker-ce.repo
sudo dnf install docker-ce docker-ce-cli containerd.io 
```
Once the installation is complete, start the Docker service

```shell
sudo systemctl enable docker
sudo systemctl start docker
```

{{% /tab %}}
{{% tab title="centos" %}}
```shell
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo 
sudo yum install docker-ce --nobest --allowerasing -y
```
Once the installation is complete, start the Docker service
```shell
sudo systemctl enable docker
sudo systemctl start docker
```

{{% /tab %}}
{{% tab title="ubuntu✅" %}}
1. Set up Docker's apt repository.
```shell
# Add Docker's official GPG key:
sudo apt-get update
sudo apt-get install ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to Apt sources:
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \ sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
```

2. Install the Docker packages.
  > latest version
  ```shell
  sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  ```

  > specific version
  ```shell
   apt-cache madison docker-ce | awk '{ print $3 }'
   echo $DOCKER_VERSION=5:28.2.1-1~XXXXX
   sudo apt-get install docker-ce=$DOCKER_VERSION docker-ce-cli=$DOCKER_VERSION containerd.io docker-buildx-plugin docker-compose-plugin
  ```

3. Verify that the installation is successful by running the hello-world image: 
```shell
sudo docker run hello-world
```

{{% /tab %}}
{{% tab title="Mac OS" %}}
visit [https://www.docker.com/products/docker-desktop ](https://www.docker.com/products/docker-desktop )
{{% /tab %}}

{{< /tabs >}}


### Info
- Docker Image saved in `/var/lib/docker`

### Mirror
You can modify `/etc/docker/daemon.json`
```json
{
  "registry-mirrors": ["<$mirror_url>"]
}
```
for example:
- `https://docker.mirrors.ustc.edu.cn`