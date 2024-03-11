+++
title = 'Helm'
date = 2024-03-07T15:00:59+08:00
+++

### 1. install binary
```shell
MIRROR="files.m.daocloud.io/"
VERSION=v3.13.3
ARCH=$(uname -m)
if [ "${ARCH}" = "x86_64" ]; then
    ARCH_IN_FILE_NAME=linux-amd64
elif [ "${ARCH}" = "aarch64" ]; then
    ARCH_IN_FILE_NAME=linux-arm64
else
    echo "NOT SUPPORT: ${ARCH}"
fi
FILE_NAME=helm-${VERSION}-${ARCH_IN_FILE_NAME}.tar.gz
curl -sSLo ${FILE_NAME} "https://${MIRROR}get.helm.sh/${FILE_NAME}"
tar zxf ${FILE_NAME}
mkdir -p ${HOME}/bin
mv -f ${ARCH_IN_FILE_NAME}/helm ${HOME}/bin
rm -rf ./${FILE_NAME}
rm -rf ./${ARCH_IN_FILE_NAME}
chmod u+x ${HOME}/bin/helm

```

### 2. helm load local image


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