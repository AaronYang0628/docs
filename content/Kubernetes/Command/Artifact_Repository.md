+++
title = 'Artifict Repository'
date = 2024-03-07T15:00:59+08:00
weight = 4
+++

### Preliminary
- Kubernetes has installed, if not check [link](kubernetes/command/install/index.html)
- argo workflows binary has installed, if not check [link](kubernetes/argo/argo-workflow/argoworkflow/index.html)
- minio is ready for artifact repository
    > endpoint: minio.storage:9000


### Steps
#### 1. prepare bucket for s3 artifact repository
```shell
# K8S_MASTER_IP could be you master ip or loadbalancer external ip
K8S_MASTER_IP=172.27.253.27
MINIO_ACCESS_SECRET=$(kubectl -n storage get secret minio-secret -o jsonpath='{.data.rootPassword}' | base64 -d)
podman run --rm \
--entrypoint bash \
--add-host=minio-api.dev.geekcity.tech:${K8S_MASTER_IP} \
-it docker.io/minio/mc:latest \
-c "mc alias set minio http://minio-api.dev.geekcity.tech admin ${MINIO_ACCESS_SECRET} \
    && mc ls minio \
    && mc mb --ignore-existing minio/argo-workflows-artifacts"
```

#### 2. prepare secret `s3-artifact-repository-credentials`
> will create **business-workflows** namespace
```shell
MINIO_ACCESS_KEY=$(kubectl -n storage get secret minio-secret -o jsonpath='{.data.rootUser}' | base64 -d)
kubectl -n business-workflows create secret generic s3-artifact-repository-credentials \
    --from-literal=accessKey=${MINIO_ACCESS_KEY} \
    --from-literal=secretKey=${MINIO_ACCESS_SECRET}
```

#### 3. prepare configMap `artifact-repositories.yaml` 
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: artifact-repositories
  annotations:
    workflows.argoproj.io/default-artifact-repository: default-artifact-repository
data:
  default-artifact-repository: |
    s3:
      endpoint: minio.storage:9000
      insecure: true
      accessKeySecret:
        name: s3-artifact-repository-credentials
        key: accessKey
      secretKeySecret:
        name: s3-artifact-repository-credentials
        key: secretKey
      bucket: argo-workflows-artifacts
```

#### 4. apply `artifact-repositories.yaml` to k8s
```shell
kubectl -n business-workflows apply -f artifact-repositories.yaml
```