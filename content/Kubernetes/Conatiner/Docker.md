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
{{% tab title="ubuntu" %}}
```shell
apt-get install apt-transport-https ca-certificates curl gnupg lsb-release
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo \
  "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get install docker-ce docker-ce-cli containerd.io
```
And then you can 
{{% /tab %}}
{{% tab title="Mac OS" %}}
visit [https://www.docker.com/products/docker-desktop ](https://www.docker.com/products/docker-desktop )
{{% /tab %}}

{{< /tabs >}}


### Test
```shell
docker info
```