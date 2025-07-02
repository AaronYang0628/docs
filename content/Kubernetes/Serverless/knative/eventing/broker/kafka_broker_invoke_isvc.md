
+++
tags = ["Kafka", "Broker"]
title = 'Kafka Broker Invoke ISVC'
date = 2024-03-07T15:00:59+08:00
weight = 110
+++

### 1. Prepare RBAC
- create cluster role to access CRD isvc 
```yaml
kubectl apply -f - <<EOF
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: kserve-access-for-knative
rules:
- apiGroups: ["serving.kserve.io"]
  resources: ["inferenceservices", "inferenceservices/status"]
  verbs: ["get", "list", "watch"]
EOF
```

- create rolebinding and grant privileges
```yaml
kubectl apply -f - <<EOF
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: kafka-controller-kserve-access
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: kserve-access-for-knative
subjects:
- kind: ServiceAccount
  name: kafka-controller
  namespace: knative-eventing
EOF
```

### 2. Create Broker Setting
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

### 3. Create Broker
```yaml
kubectl apply -f - <<EOF
apiVersion: eventing.knative.dev/v1
kind: Broker
metadata:
  annotations:
    eventing.knative.dev/broker.class: Kafka
  name: isvc-broker
  namespace: kserve-test
spec:
  config:
    apiVersion: v1
    kind: ConfigMap
    name: kafka-broker-config
    namespace: knative-eventing
  delivery:
    deadLetterSink:
      ref:
        apiVersion: serving.knative.dev/v1
        kind: Service
        name: event-display
EOF
```

### 4. Create InferenceService
{{% notice style="important" title="Reference" %}} 
you can create **isvc** `first-tourchserve` service, by following 🔗[link](/Kubernetes/Serverless/kserve/serving/predictive/first_pytorch_infer.md)
{{% /notice %}}

### 5. Create Trigger
```yaml
kubectl apply -f - << EOF
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: kserve-trigger
  namespace: kserve-test
spec:
  broker: isvc-broker
  filter:
    attributes:
      type: prediction-request
  subscriber:
    uri: http://first-torchserve.kserve-test.svc.cluster.local/v1/models/mnist:predict
EOF
```



### 6. Test
> Normally, we can invoke `first-tourchserve` by executing

```shell
export MASTER_IP=192.168.100.112
export ISTIO_INGRESS_PORT=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.spec.ports[?(@.name=="http2")].nodePort}')
export SERVICE_HOSTNAME=$(kubectl -n kserve-test get inferenceservice first-torchserve  -o jsonpath='{.status.url}' | cut -d "/" -f 3)
# http://first-torchserve.kserve-test.example.com 
curl -v -H "Host: ${SERVICE_HOSTNAME}" -H "Content-Type: application/json" "http://${MASTER_IP}:${ISTIO_INGRESS_PORT}/v1/models/mnist:predict" -d @./mnist-input.json
```

> Now, you can access model by executing
```shell
export KAFKA_BROKER_INGRESS_PORT=$(kubectl -n knative-eventing get service kafka-broker-ingress -o jsonpath='{.spec.ports[?(@.name=="http-container")].nodePort}')
curl -v "http://${MASTER_IP}:${KAFKA_BROKER_INGRESS_PORT}/kserve-test/isvc-broker" \
  -X POST \
  -H "Ce-Id: $(date +%s)" \
  -H "Ce-Specversion: 1.0" \
  -H "Ce-Type: prediction-request" \
  -H "Ce-Source: event-producer" \
  -H "Content-Type: application/json" \
  -d @./mnist-input.json 
```
{{% expand title="if you cannot see the preidction result" %}}
> please check kafka
```bash
# list all topics, find suffix is `isvc-broker` -> knative-broker-kserve-test-isvc-broker
kubectl -n database exec -it deployment/kafka-client-tools -- bash -c \
    'kafka-topics.sh --bootstrap-server $BOOTSTRAP_SERVER --command-config $CLIENT_CONFIG_FILE --list'
```

```bash
# retrieve msg from that topic
kubectl -n database exec -it deployment/kafka-client-tools -- bash -c \
  'kafka-console-consumer.sh --bootstrap-server $BOOTSTRAP_SERVER --consumer.config $CLIENT_CONFIG_FILE --topic knative-broker-kserve-test-isvc-broker --from-beginning'
```
And then, you could see
```json
{
    "instances": [
        {
            "data": "iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAAAAABXZoBIAAAAw0lEQVR4nGNgGFggVVj4/y8Q2GOR83n+58/fP0DwcSqmpNN7oOTJw6f+/H2pjUU2JCSEk0EWqN0cl828e/FIxvz9/9cCh1zS5z9/G9mwyzl/+PNnKQ45nyNAr9ThMHQ/UG4tDofuB4bQIhz6fIBenMWJQ+7Vn7+zeLCbKXv6z59NOPQVgsIcW4QA9YFi6wNQLrKwsBebW/68DJ388Nun5XFocrqvIFH59+XhBAxThTfeB0r+vP/QHbuDCgr2JmOXoSsAAKK7bU3vISS4AAAAAElFTkSuQmCC"
        }
    ]
}
{
    "predictions": [
        2
    ]
}
```
{{% /expand %}}

