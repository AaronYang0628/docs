+++
title = 'MBI L1 Job'
date = 2024-03-27T19:58:45+08:00
weight = 100
+++


### 1. [[Optional]]() prepare `l1-mbi_job.pvc.yaml`
```yaml
apiVersion: "v1"
kind: "PersistentVolumeClaim"
metadata:
  name: "mbi-l1-data-pvc"
  namespace: "application"
spec:
  accessModes:
  - "ReadWriteMany"
  resources:
    requests:
      storage: "500Gi"
  storageClassName: "nfs-external-nas"
status:
  accessModes:
  - "ReadWriteMany"
  capacity:
    storage: "500Gi"
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
      containers:
      - name: csst-msc-l1-mbi
        env:
        - name: CSST_DFS_API_MODE
          value: cluster
        - name: CSST_DFS_GATEWAY
          value: 172.27.253.66:31280
        - name: CSST_DFS_APP_ID
          value: test
        - name: CSST_DFS_APP_TOKEN
          value: test
        - name: CRDS_SERVER_URL
          value: http://10.105.20.24:29000
        - name: CSST_DFS_ROOT
          value: /dfsroot:ro
        - name: CSST_CRDS_ROOT
          value: /crdsroot:ro
        - name: CSST_AUX_DIR
          value: /pipeline/aux:ro
        image: csst/csst-msc-l1-mbi:v231227
        command: ["python",  "/pipeline/src/run.py", "--obs-id=10160000001", "--device=cpu", "--n-jobs=18", "--n-jobs-gpu=9", "--clean-l0", "--clean-l1"]
        volumeMounts:
        - mountPath: "/"
          name: "l1-job-pvc"
      volumes:
      - name: "l1-job-pvc"
        persistentVolumeClaim:
          claimName: "mbi-l1-data-pvc"
```

### 3. [[Optional]]() create pvc resource
```shell
kubectl -n application apply -f l1-mbi_job.pvc.yaml
```

### 3. apply to k8s
```shell
kubectl -n application apply -f csst-msc-l1-mbi.job.yaml
```