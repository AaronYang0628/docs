+++
tags = ["Clickhouse"]
title = 'Install Clickhouse'
date = 2024-03-07T15:00:59+08:00
+++

### Preliminary
- Kubernetes has installed, if not check [link]()
- argo workflows binary has installed, if not check [link]()
- minio is ready for artifact repository
    > endpoint: minio.storage:9000

### Steps
1. prepare bucket for s3 artifact repository
```shell
# change K8S_MASTER_IP to your k8s master ip
K8S_MASTER_IP=192.168.1.107
ACCESS_SECRET=$(kubectl -n storage get secret minio-secret -o jsonpath='{.data.rootPassword}' | base64 -d)
podman run --rm \
--entrypoint bash \
--add-host=minio-api.dev.geekcity.tech:${K8S_MASTER_IP} \
-it docker.io/minio/mc:latest \
-c "mc alias set minio http://minio-api.dev.geekcity.tech:32080 admin ${ACCESS_SECRET} \
    && mc ls minio \
    && mc mb --ignore-existing minio/argo-workflows-artifacts"


```