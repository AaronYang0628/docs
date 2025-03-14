+++
title = 'Resource Template'
date = 2024-03-08T11:16:18+08:00
weight = 5
+++


### 0. create namespace
```shell
kubectl get namespaces common-secrets > /dev/null 2>&1 || kubectl create namespace common-secrets
```

### 0. sleeping deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: rucio
  name: rucio-deployment
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: rucio
  strategy:
    rollingUpdate:
      maxSurge: 25%
      maxUnavailable: 25%
    type: RollingUpdate
  template:
    metadata:
      labels:
        app: rucio
    spec:
      containers:
      - command:
        - sleep
        - inf
        image: registry.gitlab.com/ska-telescope/src/src-dm/ska-src-dm-da-rucio-client:release-35.6.0
        imagePullPolicy: Always
        name: rucio-container
        resources: {}
      dnsPolicy: ClusterFirst
      restartPolicy: Always
      securityContext: {}
      terminationGracePeriodSeconds: 30
```

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
  name: "job-template-example-ingress"
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
        path: "/"
        pathType: "ImplementationSpecific"
  tls:
  - hosts:
    - job-template-example.flink.lab.zjvis.net
    secretName: job-template-example.flink.lab.zjvis.net-tls

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

### 6. create Job(job)
```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: datahub-s3-fits-scan-job-example
spec:
  template:
    metadata:
      name: s3-fits-scan-job
    spec:
      restartPolicy: Never
      containers:
      - name: fits-scan-job
        image: cr.registry.res.cloud.zhejianglab.com/ay-dev/datahub-s3-fits:1.0.0
        env:
        - name: SOURCE-READ-PATH
          value: s3://csst-prod/CSST_L0/MSC/SCI/60310/10100000000/MS/*.*
        - name: PIPELINE-NAME
          value: ingest_oss_fits_files
        - name: REST-SINK-URL
          value: http://datahub-gms.application:8080
        - name : AWS-ENDPOINT-URL
          valueFrom:
            secretKeyRef:
              name: job-template-config-secret
              key: oss_endpoint
        - name: AWS-KEY
          valueFrom:
            secretKeyRef:
              name: job-template-config-secret
              key: oss_access_key
        - name: AWS-SECRET
          valueFrom:
            secretKeyRef:
              name: job-template-config-secret
              key: oss_access_secret
        - name: DATAHUB-ACCESS-TOKEN
          valueFrom:
            secretKeyRef:
              name: job-template-config-secret
              key: datahub_access_token
        volumeMounts:
          - mountPath: /app/ingest.yaml
            name: job-template-file-secret
      volumes:
        - name: job-template-file-secret
          secret:
            secretName: job-template-file-secret
            items:
              - key: job.template.file.secret.yaml
                path: ingest.yaml
        - name:  job-template-config-secret
          secret:
            secretName: job-template-config-secret
            items:
              - key: oss_endpoint
                path: oss_endpoint
              - key: oss_access_key
                path: oss_access_key
              - key: oss_access_secret
                path: oss_access_secret
              - key: datahub_access_token
                path: datahub_access_token
```

### 7. create Secret(secret)
- create from literal
```shell
kubectl -n application create secret generic job-template-config-secret \
    --from-literal="oss_endpoint=http://oss-cn-hangzhou-zjy-d01-a.ops.cloud.zhejianglab.com/" \
    --from-literal="oss_access_key=${OSS_ACCESS_KEY}" \
    --from-literal="oss_access_secret=${OSS_ACCESS_SECRET}" \
    --from-literal="datahub_access_token=${DATAHUB_ACCESS_TOKEN}" \
     -o yaml --dry-run=client \
    | kubectl -n application apply -f -
```

- create from file
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: job-template-file-secret
data:
  ingest.yaml: |
    source:
      type: fits_source.S3Source
      config:
        path_specs:
        - include: ${SOURCE-READ-PATH}
        aws_config:
          aws_endpoint_url: ${AWS-ENDPOINT-URL}
          aws_access_key_id: ${AWS-KEY}
          aws_secret_access_key: ${AWS-SECRET}
        stateful_ingestion:
          enabled: true
    pipeline_name: ${PIPELINE-NAME:ingest_oss_fits}
    sink:
      type: datahub-rest
      config:
        server: ${REST-SINK-URL:http://datahub-gms.application:8080}
        token: ${DATAHUB-ACCESS-TOKEN}
```

### 8. create Service Monitor (smon)
```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  labels:
    app.kubernetes.io/instance: api-server
    app.kubernetes.io/managed-by: Helm
    app.kubernetes.io/name: nginx
    release: prometheus-stack
  name: api-server
  namespace: monitor
spec:
  endpoints:
  - port: jmx
    path: /actuator/prometheus
    relabelings:
    - action: replace
      separator: /
      sourceLabels:
      - namespace
      - pod
      targetLabel: instance
  namespaceSelector:
    matchNames:
    - data-and-computing
  selector:
    matchLabels:
      app.kubernetes.io/managed-by: Helm
      app.kubernetes.io/name: nginx
```