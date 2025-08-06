+++
tags = ["Kafka"]
title = 'Build Async Preidction Flow'
date = 2024-03-07T15:00:59+08:00
weight = 9
+++

## Flow
```mermaid
flowchart LR
    A[User Curl] -->|HTTP| B{ISVC-Broker:Kafka}
    B -->|Subscribe| D[Trigger1]
    B -->|Subscribe| E[Kserve-Triiger]
    B -->|Subscribe| F[Trigger3]
    E --> G[Mnist Service]
    G --> |Kafka-Sink| B
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
  name: isvc-broker
  namespace: kserve-test
spec:
  config:
    apiVersion: v1
    kind: ConfigMap
    name: kafka-broker-config
    namespace: knative-eventing
EOF
```

### 3. Create Trigger
{{< highlight type="yaml"  wrap="true" hl_lines="11"  >}}
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
      type: prediction-request-udf-attr # you can change this
  subscriber:
    uri: http://prediction-and-sink.kserve-test.svc.cluster.local/v1/models/mnist:predict
EOF
{{< /highlight >}}

### 4. Create InferenceService
{{< highlight type="yaml"  lineNos="true" wrap="true" hl_lines="21 23"  >}}
kubectl apply -f - <<EOF
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: prediction-and-sink
  namespace: kserve-test
spec:
  predictor:
    model:
      modelFormat:
        name: pytorch
      storageUri: gs://kfserving-examples/models/torchserve/image_classifier/v1
  transformer:
    containers:
      - image: docker-registry.lab.zverse.space/data-and-computing/ay-dev/msg-transformer:dev9
        name: kserve-container
        env:
        - name: KAFKA_BOOTSTRAP_SERVERS
          value: kafka.database.svc.cluster.local
        - name: KAFKA_TOPIC
          value: test-topic # result will be saved in this topic
        - name: REQUEST_TRACE_KEY
          value: test-trace-id # using this key to retrieve preidtion result
        command:
          - "python"
          - "-m"
          - "model"
        args:
          - --model_name
          - mnist
EOF
{{< /highlight >}}

{{% notice style="tip" title="Expectd Output" icon="check" expanded="false"%}}
```plaintext
root@ay-k3s01:~# kubectl -n kserve-test get pod
NAME                                                              READY   STATUS    RESTARTS   AGE
prediction-and-sink-predictor-00001-deployment-f64bb76f-jqv4m     2/2     Running   0          3m46s
prediction-and-sink-transformer-00001-deployment-76cccd867lksg9   2/2     Running   0          4m3s
```
{{% /notice %}}

{{% notice style="important" title="Expectd Output" icon="check" expanded="true"%}}
Source code of the  `docker-registry.lab.zverse.space/data-and-computing/ay-dev/msg-transformer:dev9` could be found 🔗[here](/Kubernetes/Serverless/kserve/serving/predictive/first_custom_transformer.md)
{{% /notice %}}


### [[Optional]]() 5. Invoke InferenceService Directly
- preparation
```shell
wget -O ./mnist-input.json https://raw.githubusercontent.com/kserve/kserve/refs/heads/master/docs/samples/v1beta1/torchserve/v1/imgconv/input.json
SERVICE_NAME=prediction-and-sink
MODEL_NAME=mnist
INPUT_PATH=@./mnist-input.json
PLAIN_SERVICE_HOSTNAME=$(kubectl -n kserve-test get inferenceservice $SERVICE_NAME -o jsonpath='{.status.url}' | cut -d "/" -f 3)
```
- fire!!
```shell
export INGRESS_HOST=192.168.100.112
export INGRESS_PORT=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.spec.ports[?(@.name=="http2")].nodePort}')
curl -v -H "Host: ${PLAIN_SERVICE_HOSTNAME}" -H "Content-Type: application/json" -d $INPUT_PATH http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:predict
```

{{% notice style="tip" title="Expectd Output" icon="check" expanded="false"%}}
```plaintext
curl -v -H "Host: ${PLAIN_SERVICE_HOSTNAME}" -H "Content-Type: application/json" -d $INPUT_PATH http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:predict
*   Trying 192.168.100.112:31855...
* Connected to 192.168.100.112 (192.168.100.112) port 31855
> POST /v1/models/mnist:predict HTTP/1.1
> Host: prediction-and-sink.kserve-test.ay.test.dev
> User-Agent: curl/8.5.0
> Accept: */*
> Content-Type: application/json
> Content-Length: 401
> 
< HTTP/1.1 200 OK
< content-length: 19
< content-type: application/json
< date: Wed, 02 Jul 2025 08:55:05 GMT,Wed, 02 Jul 2025 08:55:04 GMT
< server: istio-envoy
< x-envoy-upstream-service-time: 209
< 
* Connection #0 to host 192.168.100.112 left intact
{"predictions":[2]}
```
{{% /notice %}}



### 6. Invoke Broker
- preparation
```shell
cat > image-with-trace-id.json << EOF
{
    "test-trace-id": "16ec3446-48d6-422e-9926-8224853e84a7",
    "instances": [
        {
            "data": "iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAAAAABXZoBIAAAAw0lEQVR4nGNgGFggVVj4/y8Q2GOR83n+58/fP0DwcSqmpNN7oOTJw6f+/H2pjUU2JCSEk0EWqN0cl828e/FIxvz9/9cCh1zS5z9/G9mwyzl/+PNnKQ45nyNAr9ThMHQ/UG4tDofuB4bQIhz6fIBenMWJQ+7Vn7+zeLCbKXv6z59NOPQVgsIcW4QA9YFi6wNQLrKwsBebW/68DJ388Nun5XFocrqvIFH59+XhBAxThTfeB0r+vP/QHbuDCgr2JmOXoSsAAKK7bU3vISS4AAAAAElFTkSuQmCC"
        }
    ]
}
EOF
```
- fire!!
```shell
export MASTER_IP=192.168.100.112
export KAFKA_BROKER_INGRESS_PORT=$(kubectl -n knative-eventing get service kafka-broker-ingress -o jsonpath='{.spec.ports[?(@.name=="http-container")].nodePort}')

curl -v "http://${MASTER_IP}:${KAFKA_BROKER_INGRESS_PORT}/kserve-test/isvc-broker" \
  -X POST \
  -H "Ce-Id: $(date +%s)" \
  -H "Ce-Specversion: 1.0" \
  -H "Ce-Type: prediction-request-udf-attr" \
  -H "Ce-Source: event-producer" \
  -H "Content-Type: application/json" \
  -d @./image-with-trace-id.json 
```

- check **input data** in kafka topic `knative-broker-kserve-test-isvc-broker`
```shell
kubectl -n database exec -it deployment/kafka-client-tools -- bash -c \
  'kafka-console-consumer.sh --bootstrap-server $BOOTSTRAP_SERVER --consumer.config $CLIENT_CONFIG_FILE --topic knative-broker-kserve-test-isvc-broker --from-beginning'
```

{{% notice style="tip" title="Expectd Output" icon="check" expanded="false"%}}
```json
{
    "test-trace-id": "16ec3446-48d6-422e-9926-8224853e84a7",
    "instances": [
    {
        "data": "iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAAAAABXZoBIAAAAw0lEQVR4nGNgGFggVVj4/y8Q2GOR83n+58/fP0DwcSqmpNN7oOTJw6f+/H2pjUU2JCSEk0EWqN0cl828e/FIxvz9/9cCh1zS5z9/G9mwyzl/+PNnKQ45nyNAr9ThMHQ/UG4tDofuB4bQIhz6fIBenMWJQ+7Vn7+zeLCbKXv6z59NOPQVgsIcW4QA9YFi6wNQLrKwsBebW/68DJ388Nun5XFocrqvIFH59+XhBAxThTfeB0r+vP/QHbuDCgr2JmOXoSsAAKK7bU3vISS4AAAAAElFTkSuQmCC"
    }]
}
{
    "predictions": [2] // result will be saved in this topic as well
}
```
{{% /notice %}}

- check **response result** in kafka topic `test-topic`
```shell
kubectl -n database exec -it deployment/kafka-client-tools -- bash -c \
  'kafka-console-consumer.sh --bootstrap-server $BOOTSTRAP_SERVER --consumer.config $CLIENT_CONFIG_FILE --topic test-topic --from-beginning'
```

{{< highlight type="json"  lineNos="true" wrap="true" hl_lines="14"  >}}
{
    "specversion": "1.0",
    "id": "822e3115-0185-4752-9967-f408dda72004",
    "source": "data-and-computing/kafka-sink-transformer",
    "type": "org.zhejianglab.zverse.data-and-computing.kafka-sink-transformer",
    "time": "2025-07-02T08:57:04.133497+00:00",
    "data":
    {
        "predictions": [2]
    },
    "request-host": "prediction-and-sink-transformer.kserve-test.svc.cluster.local",
    "kserve-isvc-name": "prediction-and-sink",
    "kserve-isvc-namespace": "kserve-test",
    "test-trace-id": "16ec3446-48d6-422e-9926-8224853e84a7"
}
{{< /highlight >}}
Using `test-trace-id` to grab the result.