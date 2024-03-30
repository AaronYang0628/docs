+++
title = 'Resource Template'
date = 2024-03-08T11:16:18+08:00
weight = 5
+++


### 0. create [StorageClass]() (sc)
```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  annotations:
    meta.helm.sh/release-name: my-nfs-subdir-external-provisioner
    meta.helm.sh/release-namespace: nfs-provisioner
  creationTimestamp: "2024-03-18T08:28:45Z"
  labels:
    app: nfs-subdir-external-provisioner
    app.kubernetes.io/managed-by: Helm
    chart: nfs-subdir-external-provisioner-4.0.18
    heritage: Helm
    release: my-nfs-subdir-external-provisioner
  name: nfs-external-nas
mountOptions:
- vers=4
- minorversion=0
- rsize=1048576
- wsize=1048576
- hard
- timeo=600
- retrans=2
- noresvport
parameters:
  archiveOnDelete: "true"
provisioner: cluster.local/my-nfs-subdir-external-provisioner
reclaimPolicy: Delete
volumeBindingMode: Immediate
```

### 1. create [PersistentVolume]() (pv)
```yaml
---
apiVersion: "v1"
kind: "PersistentVolume"
metadata:
  name: <$PV_NAME>
  namespace: <$NAMESPACE>
spec:
  capacity:
    storage: "50Gi"
  storageClassName: "local-storage"
  volumeMode: "Filesystem"
  accessModes:
  - "ReadWriteMany"
  persistentVolumeReclaimPolicy: "Delete"
  local:
    path: "/mnt/flink-job"
  nodeAffinity:
    required:
      nodeSelectorTerms:
      - matchExpressions:
        - key: "kubernetes.io/hostname"
          operator: "In"
          values:
          - "cs-cluster-control-plane"
```

### 2. create [PersistentVolumeClaim]() (pvc)
```yaml
---
apiVersion: "v1"
kind: "PersistentVolumeClaim"
metadata:
  name: "flink-deployment-pvc"
  namespace: "flink"
spec:
  accessModes:
  - "ReadWriteMany"
  resources:
    requests:
      storage: "50Gi"
  storageClassName: "local-storage"
  volumeMode: "Filesystem"
  volumeName: "flink-deployment-pv"
status:
  accessModes:
  - "ReadWriteMany"
  capacity:
    storage: "50Gi"
```

### 3. create ingress
```yaml
---
apiVersion: "networking.k8s.io/v1"
kind: "Ingress"
metadata:
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "2g"
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "600"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "600"
    nginx.ingress.kubernetes.io/rewrite-target: "/$1"
  labels:
    app: "job-template-example"
  name: "job-template-example"
spec:
  ingressClassName: "nginx"
  rules:
  - host: "job-template-example.flink.lab.zjvis.net"
    http:
      paths:
      - backend:
          service:
            name: "job-template-example-rest"
            port:
              number: 8081
        path: "/?(.*)"
        pathType: "ImplementationSpecific"
```

### 4. create statefulSet (sts)
```yaml
---
apiVersion: "apps/v1"
kind: "StatefulSet"
metadata:
  name: "fpga-mock-stateful"
spec:
  selector:
    matchLabels:
      app: "nginx"
  serviceName: "nginx"
  replicas: 2
  minReadySeconds: 3
  template:
    metadata:
      labels:
        app: "nginx"
    spec:
      terminationGracePeriodSeconds: 3
      containers:
      - name: "nginx"
        image: "localhost/fpga-mock:1.0.3"
        env:
        - name: "FPGA_CLIENT_HOST_PREFIX"
          value: "job-template-example-fpga-server-"
        - name: "FPGA_CLIENT_PORT"
          value: "1080"
        - name: "RECORD_COUNT"
          value: "-1"
        - name: "RECORD_INTERVAL_MILLISECONDS"
          value: "1000"
```

### 5. create Service (svc)
```yaml
apiVersion: v1
kind: Service
metadata:
  labels:
    app.kubernetes.io/component: clickhouse
    app.kubernetes.io/instance: clickhouse
  name: clickhouse-interface
spec:
  ports:
  - name: tcp-clickhouse
    port: 9005
    protocol: TCP
    targetPort: tcp-clickhouse
    nodePort: 32005
  selector:
    app.kubernetes.io/component: clickhouse
    app.kubernetes.io/instance: clickhouse
    app.kubernetes.io/name: clickhouse
  type: NodePort
```