+++
title = 'First Model In Minio'
date = 2024-03-07T15:00:59+08:00
weight = 4
+++

### Inference Model In Minio

> More Information about `Deploy InferenceService with a saved model on S3` can be found 🔗[link](https://kserve.github.io/website/0.15/modelserving/storage/s3/s3//)


### Create Service Account

=== "yaml"
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: sa
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/s3access # replace with your IAM role ARN
    serving.kserve.io/s3-endpoint: s3.amazonaws.com # replace with your s3 endpoint e.g minio-service.kubeflow:9000
    serving.kserve.io/s3-usehttps: "1" # by default 1, if testing with minio you can set to 0
    serving.kserve.io/s3-region: "us-east-2"
    serving.kserve.io/s3-useanoncredential: "false" # omitting this is the same as false, if true will ignore provided credential and use anonymous credentials
```

=== "kubectl"
```bash
kubectl apply -f create-s3-sa.yaml
```

## Create S3 Secret and attach to Service Account

Create a secret with your [S3 user credential](https://console.aws.amazon.com/iam/home#/users), `KServe` reads the secret annotations to inject the S3 environment variables on storage initializer or model agent to download the models from S3 storage.

### Create S3 secret

=== "yaml"
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: s3creds
  annotations:
     serving.kserve.io/s3-endpoint: s3.amazonaws.com # replace with your s3 endpoint e.g minio-service.kubeflow:9000
     serving.kserve.io/s3-usehttps: "1" # by default 1, if testing with minio you can set to 0
     serving.kserve.io/s3-region: "us-east-2"
     serving.kserve.io/s3-useanoncredential: "false" # omitting this is the same as false, if true will ignore provided credential and use anonymous credentials
type: Opaque
stringData: # use `stringData` for raw credential string or `data` for base64 encoded string
  AWS_ACCESS_KEY_ID: XXXX
  AWS_SECRET_ACCESS_KEY: XXXXXXXX
```

### Attach secret to a service account

=== "yaml"
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: sa
secrets:
- name: s3creds
```

=== "kubectl"
```bash
kubectl apply -f create-s3-secret.yaml
```

!!! note
    If you are running kserve with istio sidecars enabled, there can be a race condition between the istio proxy being ready and the agent pulling models. This will result in a `tcp dial connection refused` error when the agent tries to download from s3.

    To resolve it, istio allows the blocking of other containers in a pod until the proxy container is ready.

    You can enabled this by setting `proxy.holdApplicationUntilProxyStarts: true` in `istio-sidecar-injector` configmap, `proxy.holdApplicationUntilProxyStarts` flag was introduced in Istio 1.7 as an experimental feature and is turned off by default.


## Deploy the model on S3 with `InferenceService`

Create the InferenceService with the s3 `storageUri` and the service account with s3 credential attached.

=== "New Schema"

    ```yaml
    apiVersion: "serving.kserve.io/v1beta1"
    kind: "InferenceService"
    metadata:
      name: "mnist-s3"
    spec:
      predictor:
        serviceAccountName: sa
        model:
          modelFormat:
            name: tensorflow
          storageUri: "s3://kserve-examples/mnist"
    ```

=== "Old Schema"

    ```yaml
    apiVersion: "serving.kserve.io/v1beta1"
    kind: "InferenceService"
    metadata:
      name: "mnist-s3"
    spec:
      predictor:
        serviceAccountName: sa
        tensorflow:
          storageUri: "s3://kserve-examples/mnist"
    ```

Apply the `autoscale-gpu.yaml`.

=== "kubectl"
```bash
kubectl apply -f mnist-s3.yaml
```

## Run a prediction

Now, the ingress can be accessed at `${INGRESS_HOST}:${INGRESS_PORT}` or follow [this instruction](../../../get_started/first_isvc.md#4-determine-the-ingress-ip-and-ports)
to find out the ingress IP and port.

```bash
SERVICE_HOSTNAME=$(kubectl get inferenceservice mnist-s3 -o jsonpath='{.status.url}' | cut -d "/" -f 3)

MODEL_NAME=mnist-s3
INPUT_PATH=@./input.json
curl -v -H "Host: ${SERVICE_HOSTNAME}" -H "Content-Type: application/json" http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/$MODEL_NAME:predict -d $INPUT_PATH
```

!!! success "Expected Output"

    ```{ .bash .no-copy }
    Note: Unnecessary use of -X or --request, POST is already inferred.
    *   Trying 35.237.217.209...
    * TCP_NODELAY set
    * Connected to mnist-s3.default.35.237.217.209.xip.io (35.237.217.209) port 80 (#0)
    > POST /v1/models/mnist-s3:predict HTTP/1.1
    > Host: mnist-s3.default.35.237.217.209.xip.io
    > User-Agent: curl/7.55.1
    > Accept: */*
    > Content-Length: 2052
    > Content-Type: application/x-www-form-urlencoded
    > Expect: 100-continue
    >
    < HTTP/1.1 100 Continue
    * We are completely uploaded and fine
    < HTTP/1.1 200 OK
    < content-length: 251
    < content-type: application/json
    < date: Sun, 04 Apr 2021 20:06:27 GMT
    < x-envoy-upstream-service-time: 5
    < server: istio-envoy
    <
    * Connection #0 to host mnist-s3.default.35.237.217.209.xip.io left intact
    {
        "predictions": [
            {
                "predictions": [0.327352405, 2.00153053e-07, 0.0113353515, 0.203903764, 3.62863029e-05, 0.416683704, 0.000281196437, 8.36911859e-05, 0.0403052084, 1.82206513e-05],
                "classes": 5
            }
        ]
    }
    ```
