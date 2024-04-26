+++
tags = ["Kafka"]
title = 'Install Kafka'
date = 2024-03-07T15:00:59+08:00
weight = 20
+++

### Preliminary
- Kubernetes has installed, if not check [link](kubernetes/command/install/index.html)
- argoCD has installed, if not check [link](argo/argo-cd/argocd/index.html)

### Steps

#### 1. prepare `kafka.yaml`
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: kafka
spec:
  syncPolicy:
    syncOptions:
    - CreateNamespace=true
  project: default
  source:
    repoURL: https://charts.bitnami.com/bitnami
    chart: kafka
    targetRevision: 28.0.3
    helm:
      releaseName: kafka
      values: |
        image:
          registry: m.daocloud.io/docker.io
        controller:
          replicaCount: 0
          persistence:
            enabled: false
          logPersistence:
            enabled: false
          extraConfig: |
            message.max.bytes=5242880
            default.replication.factor=3
            offsets.topic.replication.factor=3
            transaction.state.log.replication.factor=3
        broker:
          replicaCount: 3
          minId: 0
          persistence:
            enabled: false
          logPersistence:
            enabled: false
          extraConfig: |
            message.max.bytes=5242880
            default.replication.factor=3
            offsets.topic.replication.factor=3
            transaction.state.log.replication.factor=3
            sasl.mechanism.inter.broker.protocol=SCRAM-SHA-256
            sasl.enabled.mechanisms=SCRAM-SHA-256
        externalAccess:
          enabled: false
          autoDiscovery:
            enabled: false
            image:
              registry: m.daocloud.io/docker.io
        volumePermissions:
          enabled: false
          image:
            registry: m.daocloud.io/docker.io
        metrics:
          kafka:
            enabled: false
            image:
              registry: m.daocloud.io/docker.io
          jmx:
            enabled: false
            image:
              registry: m.daocloud.io/docker.io
        provisioning:
          enabled: false
        kraft:
          enabled: false
        zookeeper:
          enabled: true
          image:
            registry: m.daocloud.io/docker.io
          replicaCount: 1
          auth:
            client:
              enabled: false
            quorum:
              enabled: false
          persistence:
            enabled: false
          volumePermissions:
            enabled: false
            image:
              registry: m.daocloud.io/docker.io
            metrics:
              enabled: false
          tls:
            client:
              enabled: false
            quorum:
              enabled: false
  destination:
    server: https://kubernetes.default.svc
    namespace: database
```

#### 2. apply to k8s
```shell
kubectl -n argocd apply -f kafka.yaml
```

#### 3. sync by argocd
```shell
argocd app sync argocd/kafka
```

### Set up client tool

#### 1. create client-properties
```shell
kubectl -n database \
    create secret generic client-properties \
    --from-literal=client.properties="$(printf "security.protocol=SASL_PLAINTEXT\nsasl.mechanism=SCRAM-SHA-256\nsasl.jaas.config=org.apache.kafka.common.security.scram.ScramLoginModule required username=\"user1\" password=\"$(kubectl get secret kafka-user-passwords --namespace database -o jsonpath='{.data.client-passwords}' | base64 -d | cut -d , -f 1)\";\n")"

```

#### 2. prepare `kafka-client-tools.yaml`
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kafka-client-tools
  labels:
    app: kafka-client-tools
spec:
  replicas: 1
  selector:
    matchLabels:
      app: kafka-client-tools
  template:
    metadata:
      labels:
        app: kafka-client-tools
    spec:
      volumes:
      - name: client-properties
        secret:
          secretName: client-properties
      containers:
      - name: kafka-client-tools
        image: docker.io/bitnami/kafka:3.6.2
        volumeMounts:
        - name: client-properties
          mountPath: /bitnami/custom/client.properties
          subPath: client.properties
          readOnly: true
        env:
        - name: BOOTSTRAP_SERVER
          value: kafka.database.svc.cluster.local:9092
        - name: CLIENT_CONFIG_FILE
          value: /bitnami/custom/client.properties
        - name: ZOOKEEPER_CONNECT
          value: kafka-zookeeper.database.svc.cluster.local:2181
        command:
        - tail
        - -f
        - /etc/hosts
        imagePullPolicy: IfNotPresent
```

#### 3. apply to k8s
```shell
kubectl -n database apply -f kafka-client-tools.yaml
```

#### 4. validate function
- list topics
  ```shell
  kubectl -n database exec -it deployment/kafka-client-tools -- bash -c \
      'kafka-topics.sh --bootstrap-server $BOOTSTRAP_SERVER --command-config $CLIENT_CONFIG_FILE --list'
  ```
- create topic
  ```shell
  kubectl -n database exec -it deployment/kafka-client-tools -- bash -c \
    'kafka-topics.sh --bootstrap-server $BOOTSTRAP_SERVER --command-config $CLIENT_CONFIG_FILE --create --if-not-exists --topic test-topic'
  ```
- describe topic
  ```shell
  kubectl -n database exec -it deployment/kafka-client-tools -- bash -c \
    'kafka-topics.sh --bootstrap-server $BOOTSTRAP_SERVER --command-config $CLIENT_CONFIG_FILE --describe --topic test-topic'
  ```
- produce message
  ```shell
  kubectl -n database exec -it deployment/kafka-client-tools -- bash -c \
    'for message in $(seq 0 10); do echo $message | kafka-console-producer.sh --bootstrap-server $BOOTSTRAP_SERVER --producer.config $CLIENT_CONFIG_FILE --topic test-topic; done'
  ```
- consume message
  ```shell
  kubectl -n database exec -it deployment/kafka-client-tools -- bash -c \
    'kafka-console-consumer.sh --bootstrap-server $BOOTSTRAP_SERVER --consumer.config $CLIENT_CONFIG_FILE --topic test-topic --from-beginning'
  ```