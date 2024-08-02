+++
title = 'Dev Conatiner'
date = 2024-03-07T15:00:59+08:00
weight = 6
+++

### write devcontainer.json
```json

```

### install essentials
{{< tabs >}}
{{% tab title="fedora" %}}
```shell
dnf -y update
dnf -y instal iputils net-tools
```
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
