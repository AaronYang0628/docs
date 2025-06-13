+++
title = 'ArgoCD Binary'
date = 2024-04-07T15:00:59+08:00
+++

```shell
MIRROR="files.m.daocloud.io/"
VERSION=v2.9.3
[ $(uname -m) = x86_64 ] && curl -sSLo argocd "https://${MIRROR}github.com/argoproj/argo-cd/releases/download/${VERSION}/argocd-linux-amd64"
[ $(uname -m) = aarch64 ] && curl -sSLo argocd "https://${MIRROR}github.com/argoproj/argo-cd/releases/download/${VERSION}/argocd-linux-arm64"
chmod u+x argocd
mkdir -p ${HOME}/bin
mv -f argocd ${HOME}/bin
```
[[Optional]]() add to PATH
```shell
cat >> ~/.bashrc  << EOF
export PATH=$PATH:/root/bin
EOF
source ~/.bashrc
```
