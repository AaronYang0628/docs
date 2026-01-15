+++
title = 'OSS Template'
date = 2024-04-07T15:00:59+08:00
weight = 3
+++

### Template
```yaml
apiVersion: "flink.apache.org/v1beta1"
kind: "FlinkDeployment"
metadata:
  name: "financial-job"
spec:
  image: "cr.registry.res.cloud.wuxi-yqgcy.cn/mirror/financial-topic:1.5-oss"
  flinkVersion: "v1_17"
  flinkConfiguration:
    taskmanager.numberOfTaskSlots: "8"
    fs.oss.endpoint: http://ay-test.oss-cn-jswx-xuelang-d01-a.ops.cloud.wuxi-yqgcy.cn/
    fs.oss.accessKeyId: 4gqOVOfQqCsCUwaC
    fs.oss.accessKeySecret: xxx
  ingress:
    template: "flink.k8s.io/{{namespace}}/{{name}}(/|$)(.*)"
    className: "nginx"
    annotations:
      cert-manager.io/cluster-issuer: "self-signed-ca-issuer"
      nginx.ingress.kubernetes.io/rewrite-target: "/$2"
  serviceAccount: "flink"
  podTemplate:
    apiVersion: "v1"
    kind: "Pod"
    metadata:
      name: "financial-job"
    spec:
      containers:
        - name: "flink-main-container"
          env:
            - name: ENABLE_BUILT_IN_PLUGINS
              value: flink-oss-fs-hadoop-1.17.2.jar
  jobManager:
    resource:
      memory: "2048m"
      cpu: 1
  taskManager:
    resource:
      memory: "2048m"
      cpu: 1
  job:
    jarURI: "local:///app/application.jar"
    parallelism: 1
    upgradeMode: "stateless"
```

