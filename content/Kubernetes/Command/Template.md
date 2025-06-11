+++
title = 'Resource Template'
date = 2024-03-08T11:16:18+08:00
weight = 3
+++


### create namespace
```shell
kubectl get namespaces common-secrets > /dev/null 2>&1 || kubectl create namespace common-secrets
```

### sleeping deployment
{{< highlight type="yaml" wrap="true" hl_lines="11-13" >}}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rucio-deployment
  namespace: default
spec:
  replicas: 1
    spec:
      containers:
        image: registry.gitlab.com/ska-rucio-client:release-35.6.0
        - command:
          - sleep
          - inf
        imagePullPolicy: Always
        name: rucio-container
        resources: {}
{{< /highlight >}}


### create [StorageClass]() (sc)
```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  annotations:
    meta.helm.sh/release-name: my-nfs-subdir-external-provisioner
    meta.helm.sh/release-namespace: nfs-provisioner
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
provisioner: cluster.local/my-nfs-subdir-external-provisioner
reclaimPolicy: Delete
volumeBindingMode: Immediate
```

### create [PersistentVolume]() (pv)
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
```

### create [PersistentVolumeClaim]() (pvc)
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

### create ingress
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

### create statefulSet (sts)
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
```

### create Service (svc)
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

### create Job(job)
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

### create Secret(secret)

{{< tabs title="create from" >}}
{{% tab title="literal" %}}
```shell
kubectl -n common-secrets create secret generic git-zhejianglab-credentials \
    --from-literal="username=${GIT_USERNAME}" \
    --from-literal="password=${GIT_PASSWORD}"
```
{{% /tab %}}
{{% tab title="file" %}}
```shell
kubectl apply -n kserve-test -f - <<EOF
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
EOF
```
{{% /tab %}}
{{% tab title="other" %}}
```shell
kubectl -n datahub get secret datahub-user-secret -o json \
    | jq 'del(.metadata["namespace","creationTimestamp","resourceVersion","selfLink","uid"])' \
    | kubectl -n data-and-computing apply -f -
```
{{% /tab %}}
{{< /tabs >}}


### create Service Monitor (smon)
```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  labels:
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