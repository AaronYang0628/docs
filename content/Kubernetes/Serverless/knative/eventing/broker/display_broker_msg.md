
+++
tags = ["Kafka", "Broker"]
title = 'Display Broker Message'
date = 2024-03-07T15:00:59+08:00
weight = 40
+++

### Flow
```mermaid
flowchart LR
    A[Curl] -->|HTTP| B{Broker}
    B -->|Subscribe| D[Trigger1]
    B -->|Subscribe| E[Trigger2]
    B -->|Subscribe| F[Trigger3]
    E --> G[Display Service]
```

## Setps

### 1. Create Broker Setting
```yaml
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: kafka-broker-config
  namespace: knative-eventing
data:
  default.topic.partitions: "10"
  default.topic.replication.factor: "1"
  bootstrap.servers: "kafka.database.svc.cluster.local:9092" #kafka service address
  default.topic.config.retention.ms: "3600"
EOF
```

### 2. Create Broker
```yaml
kubectl apply -f - <<EOF
apiVersion: eventing.knative.dev/v1
kind: Broker
metadata:
  annotations:
    eventing.knative.dev/broker.class: Kafka
  name: first-broker
  namespace: kserve-test
spec:
  config:
    apiVersion: v1
    kind: ConfigMap
    name: kafka-broker-config
    namespace: knative-eventing
EOF
```
deadletterSink:

### 3. Create Trigger
```yaml
kubectl apply -f - <<EOF
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: display-service-trigger
  namespace: kserve-test
spec:
  broker: first-broker
  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: event-display
EOF
```

### 4. Create Sink Service (Display Message)
```yaml
kubectl apply -f - <<EOF
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: event-display
  namespace: kserve-test
spec:
  template:
    spec:
      containers:
        - image: gcr.io/knative-releases/knative.dev/eventing/cmd/event_display
EOF
```


### 5. Test
```shell
kubectl run curl-test --image=curlimages/curl -it --rm --restart=Never -- \
  -v "http://kafka-broker-ingress.knative-eventing.svc.cluster.local/kserve-test/first-broker" \
  -X POST \
  -H "Ce-Id: $(date +%s)" \
  -H "Ce-Specversion: 1.0" \
  -H "Ce-Type: test.type" \
  -H "Ce-Source: curl-test" \
  -H "Content-Type: application/json" \
  -d '{"test": "Broker is working"}'
```

### 6. Check message
```shell
kubectl -n kserve-test logs -f deploy/event-display-00001-deployment 
```

{{% notice style="tip" title="Expectd Output" icon="check" expanded="false"%}}
```plaintext
2025/07/02 09:01:25 Failed to read tracing config, using the no-op default: empty json tracing config
☁️  cloudevents.Event
Context Attributes,
  specversion: 1.0
  type: test.type
  source: curl-test
  id: 1751446880
  datacontenttype: application/json
Extensions,
  knativekafkaoffset: 6
  knativekafkapartition: 6
Data,
  {
    "test": "Broker is working"
  }
```
{{% /notice %}}