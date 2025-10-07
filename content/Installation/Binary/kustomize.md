+++
title = 'Kustomize Binary'
date = 2024-04-07T15:00:59+08:00
weight = 112
+++

```shell
MIRROR="github.com"
VERSION="v5.7.1"
[ $(uname -m) = x86_64 ] && curl -sSLo kustomize "https:///${MIRROR}/kubernetes-sigs/kustomize/releases/download/kustomize/${VERSION}/kustomize_${VERSION}_linux_amd64.tar.gz"
[ $(uname -m) = aarch64 ] && curl -sSLo kustomize "https:///${MIRROR}/kubernetes-sigs/kustomize/releases/download/kustomize/${VERSION}/kustomize_${VERSION}_linux_arm64.tar.gz"
chmod u+x kustomize
mkdir -p ${HOME}/bin
mv -f kustomize ${HOME}/bin
```