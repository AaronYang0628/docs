+++
title = 'Kafka Sink Transformer'
date = 2024-03-07T15:00:59+08:00
weight = 5
+++

### AlexNet Inference

> More Information about `Custom Transformer` service can be found 🔗[link](https://kserve.github.io/website/0.15/modelserving/v1beta1/transformer/torchserve_image_transformer/)

1. Implement Custom Transformer using Kserve API

{{< highlight lineNos="true" lineNoStart="1" type="py" hl_lines="41 85">}}
import os
import argparse
import json

from typing import Dict, Union
from kafka import KafkaProducer
from cloudevents.http import CloudEvent
from cloudevents.conversion import to_structured

from kserve import (
    Model,
    ModelServer,
    model_server,
    logging,
    InferRequest,
    InferResponse,
)

from kserve.logging import logger
from kserve.utils.utils import generate_uuid

kafka_producer = KafkaProducer(
    value_serializer=lambda v: json.dumps(v).encode('utf-8'),
    bootstrap_servers=os.environ.get('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092')
)

class ImageTransformer(Model):
    def __init__(self, name: str):
        super().__init__(name, return_response_headers=True)
        self.ready = True


    def preprocess(
        self, payload: Union[Dict, InferRequest], headers: Dict[str, str] = None
    ) -> Union[Dict, InferRequest]:
        logger.info("Received inputs %s", payload)
        logger.info("Received headers %s", headers)
        self.request_trace_key = os.environ.get('REQUEST_TRACE_KEY', 'algo.trace.requestId')
        if self.request_trace_key not in payload:
            logger.error("Request trace key '%s' not found in payload, you cannot trace the prediction result", self.request_trace_key)
            if "instances" not in payload:
                raise ValueError(
                    f"Request trace key '{self.request_trace_key}' not found in payload and 'instances' key is missing."
                )
        else:
            headers[self.request_trace_key] = payload.get(self.request_trace_key)
   
        return {"instances": payload["instances"]}

    def postprocess(
        self,
        infer_response: Union[Dict, InferResponse],
        headers: Dict[str, str] = None,
        response_headers: Dict[str, str] = None,
    ) -> Union[Dict, InferResponse]:
        logger.info("postprocess headers: %s", headers)
        logger.info("postprocess response headers: %s", response_headers)
        logger.info("postprocess response: %s", infer_response)

        attributes = {
            "source": "data-and-computing/kafka-sink-transformer",
            "type": "org.zhejianglab.zverse.data-and-computing.kafka-sink-transformer",
            "request-host": headers.get('host', 'unknown'),
            "kserve-isvc-name": headers.get('kserve-isvc-name', 'unknown'),
            "kserve-isvc-namespace": headers.get('kserve-isvc-namespace', 'unknown'),
            self.request_trace_key: headers.get(self.request_trace_key, 'unknown'),
        }

        _, cloudevent = to_structured(CloudEvent(attributes, infer_response))
        try:
            kafka_producer.send(os.environ.get('KAFKA_TOPIC', 'test-topic'), value=cloudevent.decode('utf-8').replace("'", '"'))
            kafka_producer.flush()
        except Exception as e:
            logger.error("Failed to send message to Kafka: %s", e)
        return infer_response

parser = argparse.ArgumentParser(parents=[model_server.parser])
args, _ = parser.parse_known_args()

if __name__ == "__main__":
    if args.configure_logging:
        logging.configure_logging(args.log_config_file)
    logging.logger.info("available model name: %s", args.model_name)
    logging.logger.info("all args: %s", args.model_name)
    model = ImageTransformer(args.model_name)
    ModelServer().start([model])

{{< /highlight >}}

1. modify `pyproject.toml`
```text
kserve
torchvision==0.18.0
pillow>=10.3.0,<11.0.0
```

1. create `Dockerfile`
  
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

