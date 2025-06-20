+++
title = 'First Pytorch ISVC'
date = 2024-03-07T15:00:59+08:00
weight = 3
+++

### Mnist Inference

> More Information about `mnist` service can be found 🔗[link](https://github.com/pytorch/examples/tree/main/mnist)

1. create a namespace
```shell
kubectl create namespace kserve-test
```

1.  deploy a sample `iris` service
```bash
kubectl apply -n kserve-test -f - <<EOF
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "first-torchserve"
  namespace: kserve-test
spec:
  predictor:
    model:
      modelFormat:
        name: pytorch
      storageUri: gs://kfserving-examples/models/torchserve/image_classifier/v1
      resources:
        limits:
          memory: 4Gi
EOF
```

1. Check `InferenceService` status
```shell
kubectl -n kserve-test get inferenceservices first-torchserve 
```

{{% notice style="tip" title="Expectd Output" icon="check" expanded="false"%}}

```bash
kubectl -n kserve-test get pod
#NAME                                           READY   STATUS    RESTARTS   AGE
#first-torchserve-predictor-00001-deplo...      2/2     Running   0          25s

kubectl -n kserve-test get inferenceservices first-torchserve
#NAME           URL   READY     PREV   LATEST   PREVROLLEDOUTREVISION   LATESTREADYREVISION   AGE
#kserve-test   first-torchserve      http://first-torchserve.kserve-test.example.com   True           100                              first-torchserve-predictor-00001   2m59s
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



4. Perform a prediction
First, prepare your inference input request inside a file:
```shell
wget -O ./mnist-input.json https://raw.githubusercontent.com/kserve/kserve/refs/heads/master/docs/samples/v1beta1/torchserve/v1/imgconv/input.json
```

{{% notice style="tip" title="Remember to forward port if using minikube" expanded="false"%}}

```bash
ssh -i ~/.minikube/machines/minikube/id_rsa docker@$(minikube ip) -L "*:${INGRESS_PORT}:0.0.0.0:${INGRESS_PORT}" -N -f
```

{{% /notice %}}

5. Invoke the service
```shell
SERVICE_HOSTNAME=$(kubectl -n kserve-test get inferenceservice first-torchserve  -o jsonpath='{.status.url}' | cut -d "/" -f 3)
# http://first-torchserve.kserve-test.example.com 
curl -v -H "Host: ${SERVICE_HOSTNAME}" -H "Content-Type: application/json" "http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/mnist:predict" -d @./mnist-input.json
```

{{% notice style="tip" title="Expectd Output" icon="check" expanded="false"%}}

```plaintext
*   Trying 192.168.58.2...
* TCP_NODELAY set
* Connected to 192.168.58.2 (192.168.58.2) port 32132 (#0)
> POST /v1/models/mnist:predict HTTP/1.1
> Host: my-torchserve.kserve-test.example.com
> User-Agent: curl/7.61.1
> Accept: */*
> Content-Type: application/json
> Content-Length: 401
> 
* upload completely sent off: 401 out of 401 bytes
< HTTP/1.1 200 OK
< content-length: 19
< content-type: application/json
< date: Mon, 09 Jun 2025 09:27:27 GMT
< server: istio-envoy
< x-envoy-upstream-service-time: 1128
< 
* Connection #0 to host 192.168.58.2 left intact
{"predictions":[2]}
```

{{% /notice %}}


