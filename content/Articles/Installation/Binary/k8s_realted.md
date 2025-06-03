+++
title = 'K8s Related'
date = 2024-04-07T15:00:59+08:00
+++

## minikube
```shell
MIRROR="files.m.daocloud.io/"
[ $(uname -m) = x86_64 ] && curl -sSLo minikube "https://${MIRROR}storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64"
[ $(uname -m) = aarch64 ] && curl -sSLo minikube "https://${MIRROR}storage.googleapis.com/minikube/releases/latest/minikube-linux-arm64"
chmod u+x minikube
mkdir -p ${HOME}/bin
mv -f minikube ${HOME}/bin
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

## builah

```shell
apt install -y git make golang-go build-essential libgpgme-dev btrfs-progs libbtrfs-dev libdevmapper-dev libostree-dev libseccomp-dev libselinux1-dev pkg-config
git clone https://github.com/containers/buildah.git
cd buildah
make & make install
```

## add to path
```shell
vim ~/.bashrc 
export PATH=$PATH:/root/bin
source ~/.bashrc
```