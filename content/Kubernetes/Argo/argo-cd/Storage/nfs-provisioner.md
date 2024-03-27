+++
title = 'NFS Provisioner'
date = 2024-03-12T15:00:59+08:00
weight = 1
+++

### Steps
#### 1. prepare `nfs-provisioner.yaml`
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: nfs-provisioner
spec:
  syncPolicy:
    syncOptions:
    - CreateNamespace=true
  project: default
  source:
    repoURL: https://kubernetes-sigs.github.io/nfs-subdir-external-provisioner
    chart: nfs-subdir-external-provisioner
    targetRevision: 4.0.18
    helm:
      releaseName: nfs-provisioner
      values: |
        image:
          repository: m.daocloud.io/registry.k8s.io/sig-storage/nfs-subdir-external-provisioner
          pullPolicy: IfNotPresent
        nfs:
          server: nfs.services.test
          path: /
          mountOptions:
          - vers=4
          - minorversion=0
          - rsize=1048576
          - wsize=1048576
          - hard
          - timeo=600
          - retrans=2
          - noresvport
          volumeName: nfs-subdir-external-provisioner-nas
          reclaimPolicy: Retain
        storageClass:
          create: true
          defaultClass: true
          name: nfs-external-nas
  destination:
    server: https://kubernetes.default.svc
    namespace: basic-components
```



#### 2. apply to k8s
```shell
kubectl -n argocd apply -f nfs-provisioner.yaml
```

#### 3. sync by argocd
```shell
argocd app sync argocd/nfs-provisioner
```