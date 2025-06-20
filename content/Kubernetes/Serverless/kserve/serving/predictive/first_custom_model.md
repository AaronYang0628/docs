+++
title = 'First Custom Model'
date = 2024-03-07T15:00:59+08:00
weight = 4
+++

### AlexNet Inference

> More Information about `AlexNet` service can be found 🔗[link](https://kserve.github.io/website/0.15/modelserving/v1beta1/custom/custom_model/)

1. Implement Custom Model using KServe API

{{< highlight lineNos="true" lineNoStart="1" type="py" hl_lines="41 85">}}
import argparse
import base64
import io
import time

from fastapi.middleware.cors import CORSMiddleware
from torchvision import models, transforms
from typing import Dict
import torch
from PIL import Image

import kserve
from kserve import Model, ModelServer, logging
from kserve.model_server import app
from kserve.utils.utils import generate_uuid


class AlexNetModel(Model):
    def __init__(self, name: str):
        super().__init__(name, return_response_headers=True)
        self.name = name
        self.load()
        self.ready = False

    def load(self):
        self.model = models.alexnet(pretrained=True)
        self.model.eval()
        # The ready flag is used by model ready endpoint for readiness probes,
        # set to True when model is loaded successfully without exceptions.
        self.ready = True

    async def predict(
        self,
        payload: Dict,
        headers: Dict[str, str] = None,
        response_headers: Dict[str, str] = None,
    ) -> Dict:
        start = time.time()
        # Input follows the Tensorflow V1 HTTP API for binary values
        # https://www.tensorflow.org/tfx/serving/api_rest#encoding_binary_values
        img_data = payload["instances"][0]["image"]["b64"]
        raw_img_data = base64.b64decode(img_data)
        input_image = Image.open(io.BytesIO(raw_img_data))
        preprocess = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406],
                                 std=[0.229, 0.224, 0.225]),
        ])
        input_tensor = preprocess(input_image).unsqueeze(0)
        output = self.model(input_tensor)
        torch.nn.functional.softmax(output, dim=1)
        values, top_5 = torch.topk(output, 5)
        result = values.flatten().tolist()
        end = time.time()
        response_id = generate_uuid()

        # Custom response headers can be added to the inference response
        if response_headers is not None:
            response_headers.update(
                {"prediction-time-latency": f"{round((end - start) * 1000, 9)}"}
            )

        return {"predictions": result}


parser = argparse.ArgumentParser(parents=[kserve.model_server.parser])
args, _ = parser.parse_known_args()

if __name__ == "__main__":
    # Configure kserve and uvicorn logger
    if args.configure_logging:
        logging.configure_logging(args.log_config_file)
    model = AlexNetModel(args.model_name)
    model.load()
    # Custom middlewares can be added to the model
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    ModelServer().start([model])
{{< /highlight >}}

2. create `requirements.txt`
```text
kserve
torchvision==0.18.0
pillow>=10.3.0,<11.0.0
```

3. create `Dockerfile`
  
{{< highlight type="dockerfile" >}}
FROM m.daocloud.io/docker.io/library/python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir  -r requirements.txt 

COPY model.py .

CMD ["python", "model.py", "--model_name=custom-model"]
{{< /highlight >}}

4. build and push custom docker image
```bash
docker build -t ay-custom-model .
docker tag ddfd0186813e docker-registry.lab.zverse.space/ay/ay-custom-model:latest
docker push docker-registry.lab.zverse.space/ay/ay-custom-model:latest
```

5. create a namespace
```bash
kubectl create namespace kserve-test
```

6.  deploy a sample `custom-model` service
```bash
kubectl apply -n kserve-test -f - <<EOF
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: ay-custom-model
spec:
  predictor:
    containers:
      - name: kserve-container
        image: docker-registry.lab.zverse.space/ay/ay-custom-model:latest
EOF
```

7. Check `InferenceService` status
```shell
kubectl -n kserve-test get inferenceservices ay-custom-model
```

{{% notice style="tip" title="Expectd Output" icon="check" expanded="false"%}}

```bash
kubectl -n kserve-test get pod
#NAME                                           READY   STATUS    RESTARTS   AGE
#ay-custom-model-predictor-00003-dcf4rk         2/2     Running   0        167m

kubectl -n kserve-test get inferenceservices ay-custom-model
#NAME           URL   READY     PREV   LATEST   PREVROLLEDOUTREVISION   LATESTREADYREVISION   AGE
#ay-custom-model   http://ay-custom-model.kserve-test.example.com   True           100                              ay-custom-model-predictor-00003   177m
```

{{% /notice %}}


After all pods are ready, you can access the service by using the following command

{{< tabs groupid="kserve" style="primary" title="Access By" icon="thumbtack" >}}

{{< tab title="LoadBalancer" style="transparent" >}}
  If the <b>EXTERNAL-IP</b> value is set, your environment has an external load balancer that you can use for the ingress gateway.

  {{< tabs groupid="1111" >}}
    {{% tab %}}
  ```bash
  export INGRESS_HOST=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
  export INGRESS_PORT=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.spec.ports[?(@.name=="http2")].nodePort}')
  ```
    {{% /tab %}}
  {{< /tabs >}}

{{< /tab >}}

{{< tab title="Node Port" style="transparent" >}}
  If the EXTERNAL-IP value is none (or perpetually pending), your environment does not provide an external load balancer for the ingress gateway. In this case, you can access the gateway using the service’s node port.

  {{< tabs groupid="1111" >}}
    {{% tab %}}
  ```bash
  export INGRESS_HOST=$(minikube ip)
  export INGRESS_PORT=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.spec.ports[?(@.name=="http2")].nodePort}')
  ```
    {{% /tab %}}
  {{< /tabs >}}
{{< /tab >}}

{{< tab title="Port Forward" style="transparent" >}}

  {{< tabs groupid="1111" >}}
    {{% tab %}}
  ```bash
  export INGRESS_HOST=$(minikube ip)
  kubectl port-forward --namespace istio-system svc/istio-ingressgateway 30080:80
  export INGRESS_PORT=30080
  ```
    {{% /tab %}}
  {{< /tabs >}}
{{< /tab >}}
{{< /tabs >}}


8. Perform a prediction
  
First, prepare your inference input request inside a file:
```shell
wget -O ./alex-net-input.json https://kserve.github.io/website/0.15/modelserving/v1beta1/custom/custom_model/input.json
```

{{% notice style="tip" title="Remember to forward port if using minikube" expanded="false"%}}

```bash
ssh -i ~/.minikube/machines/minikube/id_rsa docker@$(minikube ip) -L "*:${INGRESS_PORT}:0.0.0.0:${INGRESS_PORT}" -N -f
```

{{% /notice %}}

9. Invoke the service
```shell
export SERVICE_HOSTNAME=$(kubectl -n kserve-test get inferenceservice ay-custom-model  -o jsonpath='{.status.url}' | cut -d "/" -f 3)
# http://ay-custom-model.kserve-test.example.com
curl -v -H "Host: ${SERVICE_HOSTNAME}" -H "Content-Type: application/json" -X POST "http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/custom-model:predict" -d @.//alex-net-input.json
```

{{% notice style="tip" title="Expectd Output" icon="check" expanded="false"%}}

```plaintext
*   Trying 192.168.58.2:30704...
* Connected to 192.168.58.2 (192.168.58.2) port 30704
> POST /v1/models/custom-model:predict HTTP/1.1
> Host: ay-custom-model.kserve-test.example.com
> User-Agent: curl/8.5.0
> Accept: */*
> Content-Type: application/json
> Content-Length: 105339
> 
* We are completely uploaded and fine
< HTTP/1.1 200 OK
< content-length: 110
< content-type: application/json
< date: Wed, 11 Jun 2025 03:38:30 GMT
< prediction-time-latency: 89.966773987
< server: istio-envoy
< x-envoy-upstream-service-time: 93
< 
* Connection #0 to host 192.168.58.2 left intact
{"predictions":[14.975619316101074,14.0368070602417,13.966034889221191,12.252280235290527,12.086270332336426]}
```

{{% /notice %}}


