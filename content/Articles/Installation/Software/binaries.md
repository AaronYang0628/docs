+++
title = 'Binary'
date = 2024-04-07T15:00:59+08:00
+++


## yq
```shell
YQ_VERSION=v4.40.5
YQ_BINARY=yq_linux_amd64
wget https://github.com/mikefarah/yq/releases/download/${YQ_VERSION}/${YQ_BINARY}.tar.gz -O - |\
  tar xz && mv ${YQ_BINARY} /usr/bin/yq
```

## kubectl

```shell
MIRROR="files.m.daocloud.io/"
VERSION=$(curl -L -s https://${MIRROR}dl.k8s.io/release/stable.txt)
[ $(uname -m) = x86_64 ] && curl -sSLo kubectl "https://${MIRROR}dl.k8s.io/release/${VERSION}/bin/linux/amd64/kubectl"
[ $(uname -m) = aarch64 ] && curl -sSLo kubectl "https://${MIRROR}dl.k8s.io/release/${VERSION}/bin/linux/arm64/kubectl"
chmod u+x kubectl
mkdir -p ${HOME}/bin
mv -f kubectl ${HOME}/bin
```

## helm

```shell
ARCH_IN_FILE_NAME=linux-amd64
FILE_NAME=helm-v3.13.3-${ARCH_IN_FILE_NAME}.tar.gz
curl -sSLo ${FILE_NAME} "https://files.m.daocloud.io/get.helm.sh/${FILE_NAME}"
tar zxf ${FILE_NAME}
mkdir -p ${HOME}/bin
mv -f ${ARCH_IN_FILE_NAME}/helm ${HOME}/bin
rm -rf ./${FILE_NAME}
rm -rf ./${ARCH_IN_FILE_NAME}
chmod u+x ${HOME}/bin/helm
```
