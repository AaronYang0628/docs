+++
tags = ["Kafka"]
title = 'Install Kafka'
date = 2024-03-07T15:00:59+08:00
weight = 5
+++


### Installation

{{< tabs groupid="prometheus" style="primary" title="Install By" icon="thumbtack" >}}

{{< tab title="Helm" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  2. Helm has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>

{{< /tab >}}

{{< tab title="ArgoCD" style="transparent">}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  2. argoCD has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>

  <p> <b>1.prepare `deploy-kafka.yaml` </b></p>

{{< tabs groupid="kafka">}}
  {{% tab title="kraft-minimal" %}}
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
          registry: m.lab.zverse.space/docker.io
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
          replicaCount: 1
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
              registry: m.lab.zverse.space/docker.io
        volumePermissions:
          enabled: false
          image:
            registry: m.lab.zverse.space/docker.io
        metrics:
          kafka:
            enabled: false
            image:
              registry: m.lab.zverse.space/docker.io
          jmx:
            enabled: false
            image:
              registry: m.lab.zverse.space/docker.io
        provisioning:
          enabled: false
        kraft:
          enabled: false
        zookeeper:
          enabled: true
          image:
            registry: m.lab.zverse.space/docker.io
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
              registry: m.lab.zverse.space/docker.io
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
  {{% /tab  %}}

  {{% tab title="zookeeper-minimal-plaintext"%}}
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
          registry: m.lab.zverse.space/docker.io
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
              registry: m.lab.zverse.space/docker.io
        volumePermissions:
          enabled: false
          image:
            registry: m.lab.zverse.space/docker.io
        metrics:
          kafka:
            enabled: false
            image:
              registry: m.lab.zverse.space/docker.io
          jmx:
            enabled: false
            image:
              registry: m.lab.zverse.space/docker.io
        provisioning:
          enabled: false
        kraft:
          enabled: false
        zookeeper:
          enabled: true
          image:
            registry: m.lab.zverse.space/docker.io
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
              registry: m.lab.zverse.space/docker.io
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
  {{% /tab %}}
{{< /tabs >}}

  <p> <b>2.deploy kafka </b></p>
  {{% notice style="transparent" %}}
  ```bash
  kubectl -n argocd apply -f deploy-kafka.yaml
  ```
  {{% /notice %}}

  <p> <b>3.sync by argocd </b></p>
  {{% notice style="transparent" %}}
  ```bash
  argocd app sync argocd/kafka
  ```
  {{% /notice %}}

  <p> <b>4.set up client tool </b></p> 

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
  {{% /notice %}}

  <p> <b>6.apply client tool to k8s </b></p> 

  {{% notice style="transparent" %}}
  ```bash
  kubectl -n database apply -f kafka-client-tools.yaml
  ```
  {{% /notice %}}

  <p> <b>7.validate function </b></p> 

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


{{< tab title="Docker Compose" style="default" >}}
  <p> <b>Preliminary </b></p>
  1. Docker has installed, if not check 🔗<a href="docs/software/container/docker/index.html" target="_blank">link</a> </p></br>
   

  {{% notice style="important" title="Using Proxy" %}} 
  you can run an addinational **daocloud** image to accelerate your pulling, check [Daocloud Proxy](daocloud/index.html)
  {{% /notice %}}

  <p> <b>1.init server </b></p>

  {{% notice style="transparent" %}}
  ```bash

  ```
  {{% /notice %}}

  <p> <b>2.check dashboard </b></p>
  And then you can visit 🔗<a href="http://localhost:18123" target="_blank">http://localhost:18123</a>

  <p> <b>3.use cli api </b></p>
  And then you can visit 🔗<a href="http://localhost:19000" target="_blank">http://localhost:19000</a>
  {{% notice style="transparent" %}}
  ```bash

  ```
  {{% /notice %}}

  <p> <b>4.use visual client </b></p>
  {{% notice style="transparent" %}}
  ```bash
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