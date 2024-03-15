+++
title = 'Docker'
date = 2024-03-07T15:00:59+08:00
+++


{{< tabs >}}
{{% tab title="fedora" %}}
```shell
sudo dnf update -y \
sudo dnf config-manager --add-repo=https://download.docker.com/linux/fedora/docker-ce.repo \
sudo dnf install docker-ce docker-ce-cli containerd.io \
```
Once the installation is complete, start the Docker service
```shell
sudo systemctl start docker
``

{{% /tab %}}
{{% tab title="centos" %}}
```R
sudo yum install -y podman
```
{{% /tab %}}
{{% tab title="ubuntu" %}}
```Bash
sudo apt-get -y install podman
```
{{% /tab %}}
{{< /tabs >}}