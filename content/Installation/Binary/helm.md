+++
title = 'Helm Binary'
date = 2024-04-07T15:00:59+08:00
weight = 80
+++

```shell
ARCH_IN_FILE_NAME=linux-amd64
FILE_NAME=helm-v3.18.3-${ARCH_IN_FILE_NAME}.tar.gz
curl -sSLo ${FILE_NAME} "https://files.m.daocloud.io/get.helm.sh/${FILE_NAME}"
tar zxf ${FILE_NAME}
mkdir -p ${HOME}/bin
mv -f ${ARCH_IN_FILE_NAME}/helm ${HOME}/bin
rm -rf ./${FILE_NAME}
rm -rf ./${ARCH_IN_FILE_NAME}
chmod u+x ${HOME}/bin/helm
```
