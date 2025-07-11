+++
tags = ["Kafka"]
title = 'Install Kafka'
date = 2024-03-07T15:00:59+08:00
weight = 110
+++


### Installation

{{< tabs groupid="prometheus" style="primary" title="Install By" icon="thumbtack" >}}

{{< tab title="Helm✔️" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/kubernetes/cluster/index.html" target="_blank">link</a> </p></br>
  2. Helm binary has installed, if not check 🔗<a href="/docs/software/binary/helm/index.html" target="_blank">link</a> </p></br>

  <p> <b>1.get helm repo </b></p>

  {{% notice style="transparent" %}}
  ```bash
  helm repo add bitnami oci://registry-1.docker.io/bitnamicharts/kafka
  helm repo update
  ```
  {{% /notice %}}

  <p> <b>2.install chart </b></p>

  {{< tabs groupid="kafka" >}}
    {{% tab title="without zk" %}}
    helm upgrade --create-namespace -n database kafka --install bitnami/kafka \
      --set global.imageRegistry=m.daocloud.io/docker.io \
      --set zookeeper.enabled=false \
      --set controller.replicaCount=1 \
      --set broker.replicaCount=1 \
      --set persistance.enabled=false  \
      --version 28.0.3
    {{% /tab %}}

    {{% tab title="use zk" %}}
    helm upgrade --create-namespace -n database kafka --install bitnami/kafka \
      --set global.imageRegistry=m.daocloud.io/docker.io \
      --set zookeeper.enabled=false \
      --set controller.replicaCount=1 \
      --set broker.replicaCount=1 \
      --set persistance.enabled=false  \
      --version 28.0.3
    {{% /tab %}}
  {{< /tabs >}}


  {{% notice style="transparent" %}}
  ```shell
  kubectl -n database \
    create secret generic client-properties \
    --from-literal=client.properties="$(printf "security.protocol=SASL_PLAINTEXT\nsasl.mechanism=SCRAM-SHA-256\nsasl.jaas.config=org.apache.kafka.common.security.scram.ScramLoginModule required username=\"user1\" password=\"$(kubectl get secret kafka-user-passwords --namespace database -o jsonpath='{.data.client-passwords}' | base64 -d | cut -d , -f 1)\";\n")"
  ```
  {{% /notice %}}

  {{% notice style="transparent" %}}
  ```shell
  kubectl -n database apply -f - << EOF
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
          image: m.daocloud.io/docker.io/bitnami/kafka:3.6.2
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
          command:
          - tail
          - -f
          - /etc/hosts
          imagePullPolicy: IfNotPresent
  EOF
  ```
  {{% /notice %}}

  <p> <b>3.validate function </b></p> 

- list topics
  {{% notice style="transparent" %}}
  ```bash
  kubectl -n database exec -it deployment/kafka-client-tools -- bash -c \
      'kafka-topics.sh --bootstrap-server $BOOTSTRAP_SERVER --command-config $CLIENT_CONFIG_FILE --list'
  ```
  {{% /notice %}}

- create topic
  {{% notice style="transparent" %}}
  ```bash
  kubectl -n database exec -it deployment/kafka-client-tools -- bash -c \
    'kafka-topics.sh --bootstrap-server $BOOTSTRAP_SERVER --command-config $CLIENT_CONFIG_FILE --create --if-not-exists --topic test-topic'
  ```
  {{% /notice %}}

- describe topic
  {{% notice style="transparent" %}}
  ```bash
  kubectl -n database exec -it deployment/kafka-client-tools -- bash -c \
    'kafka-topics.sh --bootstrap-server $BOOTSTRAP_SERVER --command-config $CLIENT_CONFIG_FILE --describe --topic test-topic'
  ```
  {{% /notice %}}

- produce message
  {{% notice style="transparent" %}}
  ```bash
  kubectl -n database exec -it deployment/kafka-client-tools -- bash -c \
    'for message in $(seq 0 10); do echo $message | kafka-console-producer.sh --bootstrap-server $BOOTSTRAP_SERVER --producer.config $CLIENT_CONFIG_FILE --topic test-topic; done'
  ```
  {{% /notice %}}

- consume message
  {{% notice style="transparent" %}}
  ```bash
  kubectl -n database exec -it deployment/kafka-client-tools -- bash -c \
    'kafka-console-consumer.sh --bootstrap-server $BOOTSTRAP_SERVER --consumer.config $CLIENT_CONFIG_FILE --topic test-topic --from-beginning'
  ```
  {{% /notice %}}
{{< /tab >}}

{{< tab title="ArgoCD✔️" style="transparent">}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  2. ArgoCD has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  3. Helm binary has installed, if not check 🔗<a href="/docs/software/binary/helm/index.html" target="_blank">link</a> </p></br>

  <p> <b>1.prepare `deploy-kafka.yaml` </b></p>

{{< tabs groupid="kafka">}}
  {{% tab title="kraft-minimal❌" %}}
```yaml
kubectl -n argocd apply -f - << EOF
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
          replicaCount: 1
          persistence:
            enabled: false
          logPersistence:
            enabled: false
          extraConfig: |
            message.max.bytes=5242880
            default.replication.factor=1
            offsets.topic.replication.factor=1
            transaction.state.log.replication.factor=1
        broker:
          replicaCount: 1
          persistence:
            enabled: false
          logPersistence:
            enabled: false
          extraConfig: |
            message.max.bytes=5242880
            default.replication.factor=1
            offsets.topic.replication.factor=1
            transaction.state.log.replication.factor=1
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
          enabled: true
        zookeeper:
          enabled: false
  destination:
    server: https://kubernetes.default.svc
    namespace: database
EOF
```
  {{% /tab  %}}

  {{% tab title="zookeeper-minimal-plaintext✔️"%}}
```yaml
kubectl -n argocd apply -f - << EOF
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
        listeners:
          client:
            protocol: PLAINTEXT
          interbroker:
            protocol: PLAINTEXT
        controller:
          replicaCount: 0
          persistence:
            enabled: false
          logPersistence:
            enabled: false
          extraConfig: |
            message.max.bytes=5242880
            default.replication.factor=1
            offsets.topic.replication.factor=1
            transaction.state.log.replication.factor=1
        broker:
          replicaCount: 1
          minId: 0
          persistence:
            enabled: false
          logPersistence:
            enabled: false
          extraConfig: |
            message.max.bytes=5242880
            default.replication.factor=1
            offsets.topic.replication.factor=1
            transaction.state.log.replication.factor=1
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
EOF
```
  {{% /tab %}}
{{< /tabs >}}

  <p> <b>2.sync by argocd </b></p>
  {{% notice style="transparent" %}}
  ```bash
  argocd app sync argocd/kafka
  ```
  {{% /notice %}}

  <p> <b>3.set up client tool </b></p> 

{{< tabs groupid="kafka">}}
  {{% tab title="sasl-plaintext" %}}
```shell
kubectl -n database \
    create secret generic client-properties \
    --from-literal=client.properties="$(printf "security.protocol=SASL_PLAINTEXT\nsasl.mechanism=SCRAM-SHA-256\nsasl.jaas.config=org.apache.kafka.common.security.scram.ScramLoginModule required username=\"user1\" password=\"$(kubectl get secret kafka-user-passwords --namespace database -o jsonpath='{.data.client-passwords}' | base64 -d | cut -d , -f 1)\";\n")"
```
  {{% /tab %}}

    {{% tab title="plaintext" %}}
```shell
kubectl -n database \
    create secret generic client-properties \
    --from-literal=client.properties="security.protocol=PLAINTEXT"
```
  {{% /tab %}}
{{< /tabs >}}

  <p> <b>5.prepare `kafka-client-tools.yaml` </b></p> 

  {{% notice style="transparent" %}}
  ```yaml
  kubectl -n database apply -f - << EOF
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
          image: m.daocloud.io/docker.io/bitnami/kafka:3.6.2
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
  EOF
  ```
  {{% /notice %}}

  <p> <b>6.validate function </b></p> 

- list topics
  {{% notice style="transparent" %}}
  ```bash
  kubectl -n database exec -it deployment/kafka-client-tools -- bash -c \
      'kafka-topics.sh --bootstrap-server $BOOTSTRAP_SERVER --command-config $CLIENT_CONFIG_FILE --list'
  ```
  {{% /notice %}}

- create topic
  {{% notice style="transparent" %}}
  ```bash
  kubectl -n database exec -it deployment/kafka-client-tools -- bash -c \
    'kafka-topics.sh --bootstrap-server $BOOTSTRAP_SERVER --command-config $CLIENT_CONFIG_FILE --create --if-not-exists --topic test-topic'
  ```
  {{% /notice %}}

- describe topic
  {{% notice style="transparent" %}}
  ```bash
  kubectl -n database exec -it deployment/kafka-client-tools -- bash -c \
    'kafka-topics.sh --bootstrap-server $BOOTSTRAP_SERVER --command-config $CLIENT_CONFIG_FILE --describe --topic test-topic'
  ```
  {{% /notice %}}

- produce message
  {{% notice style="transparent" %}}
  ```bash
  kubectl -n database exec -it deployment/kafka-client-tools -- bash -c \
    'for message in $(seq 0 10); do echo $message | kafka-console-producer.sh --bootstrap-server $BOOTSTRAP_SERVER --producer.config $CLIENT_CONFIG_FILE --topic test-topic; done'
  ```
  {{% /notice %}}

- consume message
  {{% notice style="transparent" %}}
  ```bash
  kubectl -n database exec -it deployment/kafka-client-tools -- bash -c \
    'kafka-console-consumer.sh --bootstrap-server $BOOTSTRAP_SERVER --consumer.config $CLIENT_CONFIG_FILE --topic test-topic --from-beginning'
  ```
  {{% /notice %}}

{{< /tab >}}


{{< tab title="Docker Compose✔️" style="default" >}}
  <p> <b>Preliminary </b></p>
  1. Docker has installed, if not check 🔗<a href="docs/software/container/docker/index.html" target="_blank">link</a> </p></br>
   

  {{% notice style="important" title="Using Proxy" %}} 
  you can run an addinational **daocloud** image to accelerate your pulling, check [Daocloud Proxy](daocloud/index.html)
  {{% /notice %}}

  <p> <b>1.init server </b></p>

  {{% notice style="transparent" %}}
  ```bash
  mkdir -p kafka/data
  chmod -R 777 kafka/data
  podman run --rm \
      --name kafka-server \
      --hostname kafka-server \
      -p 9092:9092 \
      -p 9094:9094 \
      -v $(pwd)/kafka/data:/bitnami/kafka/data \
      -e KAFKA_CFG_NODE_ID=0 \
      -e KAFKA_CFG_PROCESS_ROLES=controller,broker \
      -e KAFKA_CFG_CONTROLLER_QUORUM_VOTERS=0@kafka-server:9093 \
      -e KAFKA_CFG_LISTENERS=PLAINTEXT://:9092,CONTROLLER://:9093,EXTERNAL://:9094 \
      -e KAFKA_CFG_ADVERTISED_LISTENERS=PLAINTEXT://kafka:9092,EXTERNAL://host.containers.internal:9094 \
      -e KAFKA_CFG_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,EXTERNAL:PLAINTEXT,PLAINTEXT:PLAINTEXT \
      -e KAFKA_CFG_CONTROLLER_LISTENER_NAMES=CONTROLLER \
      -d m.daocloud.io/docker.io/bitnami/kafka:3.6.2
  ```
  {{% /notice %}}

  <p> <b>2.list topic </b></p>
  {{% notice style="transparent" %}}
  ```bash
  BOOTSTRAP_SERVER=host.containers.internal:9094
  podman run --rm \
      -it m.daocloud.io/docker.io/bitnami/kafka:3.6.2 kafka-topics.sh \
          --bootstrap-server $BOOTSTRAP_SERVER --list

  ```
  {{% /notice %}}


  <p> <b>2.create topic </b></p>
  {{% notice style="transparent" %}}
  ```bash
  BOOTSTRAP_SERVER=host.containers.internal:9094
  # BOOTSTRAP_SERVER=10.200.60.64:9094
  TOPIC=test-topic
  podman run --rm \
      -it m.daocloud.io/docker.io/bitnami/kafka:3.6.2 kafka-topics.sh \
          --bootstrap-server $BOOTSTRAP_SERVER \
          --create \
          --if-not-exists \
          --topic $TOPIC
  ```
  {{% /notice %}}


  <p> <b>2.consume record </b></p>
  {{% notice style="transparent" %}}
  ```bash
  BOOTSTRAP_SERVER=host.containers.internal:9094
  # BOOTSTRAP_SERVER=10.200.60.64:9094
  TOPIC=test-topic
  podman run --rm \
      -it m.daocloud.io/docker.io/bitnami/kafka:3.6.2 kafka-console-consumer.sh \
          --bootstrap-server $BOOTSTRAP_SERVER \
          --topic $TOPIC \
          --from-beginning
  ```
  {{% /notice %}}






{{< /tab >}}

{{< /tabs >}}



### FAQ

{{% expand title="Q1: Show me almost **endless** possibilities" %}}
You can add standard markdown syntax:

- multiple paragraphs
- bullet point lists
- _emphasized_, **bold** and even **_bold emphasized_** text
- [links](https://example.com)
- etc.

```plaintext
...and even source code
```

> the possibilities are endless (almost - including other shortcodes may or may not work)
{{% /expand %}}


{{% expand title="Q2: Show me almost **endless** possibilities" %}}
You can add standard markdown syntax:

- multiple paragraphs
- bullet point lists
- _emphasized_, **bold** and even **_bold emphasized_** text
- [links](https://example.com)
- etc.

```plaintext
...and even source code
```

> the possibilities are endless (almost - including other shortcodes may or may not work)
{{% /expand %}}