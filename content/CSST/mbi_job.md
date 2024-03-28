+++
title = 'MBI L1 Job'
date = 2024-03-27T19:58:45+08:00
weight = 100
+++


### Preliminary
- prepare pvc `csst-data-pvc`, if not then check [link](csst/init_ccds_server/index.html)
- prepare pvc `ccds-data-pvc`, if not then check [link](csst/init_ccds_server/index.html)


### 1. prepare `csst-msc-l1-mbi-aux-pvc.yaml`
```yaml
apiVersion: "v1"
kind: "PersistentVolumeClaim"
metadata:
  name: "csst-msc-l1-mbi-aux-pvc"
  namespace: "application"
spec:
  accessModes:
  - "ReadWriteMany"
  resources:
    requests:
      storage: "200Gi"
  storageClassName: "nfs-external-nas"
status:
  accessModes:
  - "ReadWriteMany"
  capacity:
    storage: "200Gi"
```

### 2. prepare `csst-msc-l1-mbi.job.yaml`
```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: csst-msc-l1-mbi
spec:
  template:
    spec:
      securityContext:
        runAsUser: 0
        runAsGroup: 0
      containers:
        - name: csst-msc-l1-mbi
          env:
            - name: CSST_DFS_API_MODE
              value: cluster
            - name: CSST_DFS_GATEWAY
              value: csst-gateway.application
            - name: CSST_DFS_APP_ID
              value: test
            - name: CSST_DFS_APP_TOKEN
              value: test
            - name: CRDS_SERVER_URL
              value: ccds-server-nginx.application
            - name: CSST_DFS_ROOT
              value: /dfsroot:ro
            - name: CSST_CRDS_ROOT
              value: /ccdsroot:ro
            - name: CSST_AUX_DIR
              value: /pipeline/aux:ro
          image: cr.registry.res.cloud.wuxi-yqgcy.cn/mirror/csst-msc-l1-mbi:v240328
          command:
            - tail
          args:
            - -f
            - /etc/hosts
          volumeMounts:
            - mountPath: /pipeline/input
              name: csst-msc-l1-mbi-input
            - mountPath: /pipeline/output
              name: csst-msc-l1-mbi-output
            - mountPath: /pipeline/aux
              name: csst-msc-l1-mbi-aux-pvc
            - mountPath: /dfsroot
              name: csst-data-pvc
            - mountPath: /ccdsroot
              name: ccds-data-pvc
      volumes:
        - name: csst-msc-l1-mbi-input
          emptyDir: {}
        - name: csst-msc-l1-mbi-output
          emptyDir: {}
        - name: csst-msc-l1-mbi-aux-pvc
          persistentVolumeClaim:
            claimName: csst-msc-l1-mbi-aux-pvc
        - name: csst-data-pvc
          persistentVolumeClaim:
            claimName: csst-data-pvc
        - name: ccds-data-pvc
          persistentVolumeClaim:
            claimName: ccds-data-pvc
      restartPolicy: OnFailure
```

### 3. [[Optional]]() create pvc resource
```shell
kubectl -n application apply -f l1-mbi_job.pvc.yaml
```

### 4. [[Optional]]() delete on k8s
```shell
kubectl -n application delete -f csst-msc-l1-mbi.job.yaml 
```

### 4. [[Optional]]() apply on k8s
```shell
kubectl -n application apply -f csst-msc-l1-mbi.job.yaml
```

### 5. exec into pod
```shell
kubectl -n application exec -it <$pod_id> -- bash
```

### 6. run command in the pod
```shell
python /pipeline/src/run.py --obs-id=10160000001 --device=cpu --n-jobs=18 --n-jobs-gpu=9 --clean-l0 --clean-l1
```