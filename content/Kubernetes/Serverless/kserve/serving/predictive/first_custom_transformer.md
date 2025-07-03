+++
title = 'Kafka Sink Transformer'
date = 2024-03-07T15:00:59+08:00
weight = 5
+++

### AlexNet Inference

> More Information about `Custom Transformer` service can be found 🔗[link](https://kserve.github.io/website/0.15/modelserving/v1beta1/transformer/torchserve_image_transformer/)

1. Implement Custom Transformer `./model.py` using Kserve API

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

1. modify `./pyproject.toml`
```toml
[tool.poetry]
name = "custom_transformer"
version = "0.15.2"
description = "Custom Transformer Examples. Not intended for use outside KServe Frameworks Images."
authors = ["Dan Sun <dsun20@bloomberg.net>"]
license = "Apache-2.0"
packages = [
    { include = "*.py" }
]

[tool.poetry.dependencies]
python = ">=3.9,<3.13"
kserve = {path = "../kserve", develop = true}
pillow = "^10.3.0"
kafka-python = "^2.2.15"
cloudevents = "^1.11.1"

[[tool.poetry.source]]
name = "pytorch"
url = "https://download.pytorch.org/whl/cpu"
priority = "explicit"

[tool.poetry.group.test]
optional = true

[tool.poetry.group.test.dependencies]
pytest = "^7.4.4"
mypy = "^0.991"

[tool.poetry.group.dev]
optional = true

[tool.poetry.group.dev.dependencies]
black = { version = "~24.3.0", extras = ["colorama"] }

[tool.poetry-version-plugin]
source = "file"
file_path = "../VERSION"

[build-system]
requires = ["poetry-core>=1.0.0"]
build-backend = "poetry.core.masonry.api"
```

2. prepare `../custom_transformer.Dockerfile`
  
{{< highlight type="dockerfile" >}}
ARG PYTHON_VERSION=3.11
ARG BASE_IMAGE=python:${PYTHON_VERSION}-slim-bookworm
ARG VENV_PATH=/prod_venv

FROM ${BASE_IMAGE} AS builder

# Install Poetry
ARG POETRY_HOME=/opt/poetry
ARG POETRY_VERSION=1.8.3

RUN python3 -m venv ${POETRY_HOME} && ${POETRY_HOME}/bin/pip install poetry==${POETRY_VERSION}
ENV PATH="$PATH:${POETRY_HOME}/bin"

# Activate virtual env
ARG VENV_PATH
ENV VIRTUAL_ENV=${VENV_PATH}
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

COPY kserve/pyproject.toml kserve/poetry.lock kserve/
RUN cd kserve && poetry install --no-root --no-interaction --no-cache
COPY kserve kserve
RUN cd kserve && poetry install --no-interaction --no-cache

COPY custom_transformer/pyproject.toml custom_transformer/poetry.lock custom_transformer/
RUN cd custom_transformer && poetry install --no-root --no-interaction --no-cache
COPY custom_transformer custom_transformer
RUN cd custom_transformer && poetry install --no-interaction --no-cache


FROM ${BASE_IMAGE} AS prod

COPY third_party third_party

# Activate virtual env
ARG VENV_PATH
ENV VIRTUAL_ENV=${VENV_PATH}
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

RUN useradd kserve -m -u 1000 -d /home/kserve

COPY --from=builder --chown=kserve:kserve $VIRTUAL_ENV $VIRTUAL_ENV
COPY --from=builder kserve kserve
COPY --from=builder custom_transformer custom_transformer

USER 1000
ENTRYPOINT ["python", "-m", "custom_transformer.model"]
{{< /highlight >}}

3. regenerate poetry.lock
```shell
poetry lock --no-update
```

4. build and push custom docker image
```bash
cd python
podman build -t docker-registry.lab.zverse.space/data-and-computing/ay-dev/msg-transformer:dev9 -f custom_transformer.Dockerfile .

podman push docker-registry.lab.zverse.space/data-and-computing/ay-dev/msg-transformer:dev9
```
