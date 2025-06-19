+++
title = 'Minikube Binary' 
date = 2024-04-07T15:00:59+08:00
weight = 131
+++

```shell
MIRROR="files.m.daocloud.io/"
[ $(uname -m) = x86_64 ] && curl -sSLo minikube "https://${MIRROR}storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64"
[ $(uname -m) = aarch64 ] && curl -sSLo minikube "https://${MIRROR}storage.googleapis.com/minikube/releases/latest/minikube-linux-arm64"
chmod u+x minikube
mkdir -p ${HOME}/bin
mv -f minikube ${HOME}/bin
```