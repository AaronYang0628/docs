+++
title = 'First Generative Service'
date = 2024-03-07T15:00:59+08:00
weight = 2
+++

<!-- ### Route

```mermaid
graph LR
    A[ML 模型] --> B(KServe 推理服务)
    B --> C[[Knative Serving]] --> D[自动扩缩容/灰度发布]
    B --> E[[Istio]] --> F[流量管理/安全]
    B --> G[[存储系统]] --> H[S3/GCS/PVC]
``` -->



### 单YAML部署推理服务
```yaml
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "sklearn-iris"
  namespace: kserve-test
spec:
  predictor:
    model:
      modelFormat:
        name: sklearn
      resources: {}
      storageUri: "gs://kfserving-examples/models/sklearn/1.0/model"
```

### check CRD
```shell
kubectl -n kserve-test get inferenceservices sklearn-iris 
```


```shell
kubectl -n istio-system get svc istio-ingressgateway 
```

```shell
export INGRESS_HOST=$(minikube ip)
export INGRESS_PORT=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.spec.ports[?(@.name=="http2")].nodePort}')
```

```shell
SERVICE_HOSTNAME=$(kubectl -n kserve-test get inferenceservice sklearn-iris  -o jsonpath='{.status.url}' | cut -d "/" -f 3)
# http://sklearn-iris.kserve-test.example.com 
curl -v -H "Host: ${SERVICE_HOSTNAME}" -H "Content-Type: application/json" "http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/sklearn-iris:predict" -d @./iris-input.json
```

### How to deploy your own ML model

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: huggingface-llama3
  namespace: kserve-test
  annotations:
    serving.kserve.io/deploymentMode: RawDeployment
    serving.kserve.io/autoscalerClass: none
spec:
  predictor:
    model:
      modelFormat:
        name: huggingface
      storageUri: pvc://llama-3-8b-pvc/hf/8b_instruction_tuned
    workerSpec:
      pipelineParallelSize: 2
      tensorParallelSize: 1
      containers:
      - name: worker-container
          resources: 
          requests:
              nvidia.com/gpu: "8"

```
check [https://kserve.github.io/website/0.15/modelserving/v1beta1/llm/huggingface/multi-node/#workerspec-and-servingruntime](https://kserve.github.io/website/0.15/modelserving/v1beta1/llm/huggingface/multi-node/#workerspec-and-servingruntime)


