+++
title = 'Kind Binary'
date = 2025-04-07T15:00:59+08:00
weight = 110
+++

```shell
MIRROR="files.m.daocloud.io/"
VERSION=v0.29.0
[ $(uname -m) = x86_64 ] && curl -sSLo kind "https://${MIRROR}github.com/kubernetes-sigs/kind/releases/download/${VERSION}/kind-linux-amd64"
[ $(uname -m) = aarch64 ] && curl -sSLo kind "https://${MIRROR}github.com/kubernetes-sigs/kind/releases/download/${VERSION}/kind-linux-arm64"
chmod u+x kind
mkdir -p ${HOME}/bin
mv -f kind ${HOME}/bin
```