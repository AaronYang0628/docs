+++
title = 'Helm Chart'
date = 2024-03-07T15:00:59+08:00
+++

You can get basic helm chart from [ArtifactHub](https://artifacthub.io/)

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
- Add repository
    ```shell
    helm repo add bitnami https://charts.bitnami.com/bitnami
    ```
- Install chart
    ```shell
    helm install my-clickhouse bitnami/clickhouse --version 6.2.16
    ```

### 3. chart template 
A `chart` is a collection of files that describe a related set of Kubernetes resources. 
You can change editable value to customize your software.
```yaml
helm:
    releaseName: clickhouse
    values: |
    image:
        registry: m.daocloud.io/docker.io
        pullPolicy: IfNotPresent
    persistence:
        enabled: true
        storageClass: "nfs-external-nas"
            accessModes:
            - ReadWriteOnce
        size: 100Gi
    volumePermissions:
        enabled: false
        image:
            registry: m.daocloud.io/docker.io
            pullPolicy: IfNotPresent
    zookeeper:
        enabled: true
        image:
            registry: m.daocloud.io/docker.io
            pullPolicy: IfNotPresent
        replicaCount: 3
        persistence:
            enabled: false
        volumePermissions:
            enabled: false
        image:
            registry: m.daocloud.io/docker.io
            pullPolicy: IfNotPresent
    shards: 2
    replicaCount: 3
    ingress:
        enabled: true
        annotations:
            cert-manager.io/cluster-issuer: self-signed-ca-issuer
            nginx.ingress.kubernetes.io/rewrite-target: /$1
        hostname: clickhouse.dev.geekcity.tech
        ingressClassName: nginx
        path: /?(.*)
        tls: true
    persistence:
        storageClass: "nfs-external-nas"
            accessModes:
            - ReadWriteOnce
        size: 20Gi
    auth:
        username: admin
        existingSecret: clickhouse-admin-credentials
        existingSecretKey: password
```