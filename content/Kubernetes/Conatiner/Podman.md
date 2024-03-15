+++
title = 'Podman'
date = 2024-03-07T15:00:59+08:00
weight = 2
+++


{{< tabs >}}
{{% tab title="fedora" %}}
```shell
sudo dnf -y install podman
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

### podman run
start an container
```shell
podman run [params]
```
`-rm`: delete if failed 

`-v`: load a volume
