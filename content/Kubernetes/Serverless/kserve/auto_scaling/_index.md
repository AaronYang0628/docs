+++
title = 'Auto Scaling'
date = 2024-03-07T15:00:59+08:00
weight = 40
+++


### Soft Limit
You can configure InferenceService with annotation `autoscaling.knative.dev/target` for a soft limit. The soft limit is a targeted limit rather than a strictly enforced bound, particularly if there is a sudden burst of requests, <b>this value can be exceeded</b>.


{{< highlight type="yaml" wrap="true" hl_lines="7" >}}
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "sklearn-iris"
  namespace: kserve-test
  annotations:
    autoscaling.knative.dev/target: "5"
spec:
  predictor:
    model:
      args: ["--enable_docs_url=True"]
      modelFormat:
        name: sklearn
      resources: {}
      runtime: kserve-sklearnserver
      storageUri: "gs://kfserving-examples/models/sklearn/1.0/model"
{{< /highlight >}}


### Hard Limit
You can also configure InferenceService with field `containerConcurrency` with a hard limit. The hard limit is an enforced upper bound. If concurrency reaches the hard limit, surplus requests will be buffered and must wait until enough capacity is free to execute the requests.

{{< highlight type="yaml" wrap="true" hl_lines="8" >}}
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "sklearn-iris"
  namespace: kserve-test
spec:
  predictor:
    containerConcurrency: 5
    model:
      args: ["--enable_docs_url=True"]
      modelFormat:
        name: sklearn
      resources: {}
      runtime: kserve-sklearnserver
      storageUri: "gs://kfserving-examples/models/sklearn/1.0/model"
{{< /highlight >}}

### Scale with QPS
{{< highlight type="yaml" wrap="true" hl_lines="8-9" >}}
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "sklearn-iris"
  namespace: kserve-test
spec:
  predictor:
    scaleTarget: 1
    scaleMetric: qps
    model:
      args: ["--enable_docs_url=True"]
      modelFormat:
        name: sklearn
      resources: {}
      runtime: kserve-sklearnserver
      storageUri: "gs://kfserving-examples/models/sklearn/1.0/model"
{{< /highlight >}}

### Scale with GPU
{{< highlight type="yaml" wrap="true" hl_lines="8-9" >}}
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "flowers-sample-gpu"
  namespace: kserve-test
spec:
  predictor:
    scaleTarget: 1
    scaleMetric: concurrency
    model:
      modelFormat:
        name: tensorflow
      storageUri: "gs://kfserving-examples/models/tensorflow/flowers"
      runtimeVersion: "2.6.2-gpu"
      resources:
        limits:
          nvidia.com/gpu: 1
{{< /highlight >}}

### Enable Scale To Zero
{{< highlight type="yaml" wrap="true" hl_lines="8" >}}
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "sklearn-iris"
  namespace: kserve-test
spec:
  predictor:
    minReplicas: 0
    model:
      args: ["--enable_docs_url=True"]
      modelFormat:
        name: sklearn
      resources: {}
      runtime: kserve-sklearnserver
      storageUri: "gs://kfserving-examples/models/sklearn/1.0/model"
{{< /highlight >}}

### Prepare Concurrent Requests Container
```shell
# export INGRESS_PORT=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.spec.ports[?(@.name=="http2")].nodePort}')
podman run --rm \
      -v /root/kserve/iris-input.json:/tmp/iris-input.json \
      --privileged \
      -e INGRESS_HOST=$(minikube ip) \
      -e INGRESS_PORT=32132 \
      -e MODEL_NAME=sklearn-iris \
      -e INPUT_PATH=/tmp/iris-input.json \
      -e SERVICE_HOSTNAME=sklearn-iris.kserve-test.example.com \
      -it m.daocloud.io/docker.io/library/golang:1.22  bash -c "go install github.com/rakyll/hey@latest; bash"
```

### Fire
> Send traffic in 30 seconds spurts maintaining 5 in-flight requests.
```shell
hey -z 30s -c 100 -m POST -host ${SERVICE_HOSTNAME} -D $INPUT_PATH http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:predict
```
{{% notice style="tip" title="Expectd Output" icon="check" expanded="false"%}}
```plaintext
Summary:
  Total:        30.1390 secs
  Slowest:      0.5015 secs
  Fastest:      0.0252 secs
  Average:      0.1451 secs
  Requests/sec: 687.3483
  
  Total data:   4371076 bytes
  Size/request: 211 bytes

Response time histogram:
  0.025 [1]     |
  0.073 [14]    |
  0.120 [33]    |
  0.168 [19363] |■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
  0.216 [1171]  |■■
  0.263 [28]    |
  0.311 [6]     |
  0.359 [0]     |
  0.406 [0]     |
  0.454 [0]     |
  0.502 [100]   |


Latency distribution:
  10% in 0.1341 secs
  25% in 0.1363 secs
  50% in 0.1388 secs
  75% in 0.1462 secs
  90% in 0.1587 secs
  95% in 0.1754 secs
  99% in 0.1968 secs

Details (average, fastest, slowest):
  DNS+dialup:   0.0000 secs, 0.0252 secs, 0.5015 secs
  DNS-lookup:   0.0000 secs, 0.0000 secs, 0.0000 secs
  req write:    0.0000 secs, 0.0000 secs, 0.0005 secs
  resp wait:    0.1451 secs, 0.0251 secs, 0.5015 secs
  resp read:    0.0000 secs, 0.0000 secs, 0.0003 secs

Status code distribution:
  [500] 20716 responses
```
{{% /notice %}}

###  Reference
For more information, please refer to the [KPA documentation](https://kserve.github.io/website/master/modelserving/autoscaling/autoscaling).