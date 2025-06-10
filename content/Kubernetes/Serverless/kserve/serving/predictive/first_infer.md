+++
title = 'First Inference Service'
date = 2024-03-07T15:00:59+08:00
weight = 2
+++

## Iris Inference

> More Information about `iris` service can be found 🔗[link](https://scikit-learn.org/1.4/auto_examples/datasets/plot_iris_dataset.html)

### 1. create a namespace
```shell
kubectl create namespace kserve-test
```

### 2.  deploy a sample `iris` service
```bash
kubectl apply -n kserve-test -f - <<EOF
apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "sklearn-iris"
  namespace: kserve-test
spec:
  predictor:
    model:
      args: ["--enable_docs_url=True"]
      modelFormat:
        name: sklearn
      resources: {}
      runtime: kserve-sklearnserver
      storageUri: "gs://kfserving-examples/models/sklearn/1.0/model"
EOF
```

### 3. Check `InferenceService` status
```shell
kubectl -n kserve-test get inferenceservices sklearn-iris 
```

{{% notice style="tip" title="Expectd Output" icon="check" expanded="false"%}}

```bash
kubectl -n kserve-test get pod
#NAME                                      READY   STATUS    RESTARTS   AGE
#sklearn-iris-predictor-00001-depl...      2/2     Running   0          25s

kubectl -n istio-system get svc istio-ingressgateway 
#NAME                   TYPE           CLUSTER-IP      EXTERNAL-IP   PORT(S)                                      AGE
#istio-ingressgateway   LoadBalancer   10.109.126.91   <pending>     15021:31427/TCP,80:32132/TCP,443:32239/TCP   28m

kubectl -n kserve-test get inferenceservices sklearn-iris
#NAME           URL   READY     PREV   LATEST   PREVROLLEDOUTREVISION   LATESTREADYREVISION   AGE
#sklearn-iris   http://sklearn-iris.kserve-test.example.com   True       100         sklearn-iris-predictor-00001   12m
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
  export INGRESS_PORT=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.spec.ports[?(@.name=="http2")].port}')
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



### 4. Perform a prediction
First, prepare your inference input request inside a file:
```shell
cat <<EOF > "./iris-input.json"
{
  "instances": [
    [6.8,  2.8,  4.8,  1.4],
    [6.0,  3.4,  4.5,  1.6]
  ]
}
EOF

```

{{% notice style="tip" title="Remember to forward port if using minikube" expanded="false"%}}

```bash
ssh -i ~/.minikube/machines/minikube/id_rsa docker@$(minikube ip) -L "*:${INGRESS_PORT}:0.0.0.0:${INGRESS_PORT}" -N -f
```

{{% /notice %}}

### 5. Invoke the service
```shell
SERVICE_HOSTNAME=$(kubectl -n kserve-test get inferenceservice sklearn-iris  -o jsonpath='{.status.url}' | cut -d "/" -f 3)
# http://sklearn-iris.kserve-test.example.com 
curl -v -H "Host: ${SERVICE_HOSTNAME}" -H "Content-Type: application/json" "http://${INGRESS_HOST}:${INGRESS_PORT}/v1/models/sklearn-iris:predict" -d @./iris-input.json
```

{{% notice style="tip" title="Expectd Output" icon="check" expanded="false"%}}

```plaintext
*   Trying 192.168.58.2...
* TCP_NODELAY set
* Connected to 192.168.58.2 (192.168.58.2) port 32132 (#0)
> POST /v1/models/sklearn-iris:predict HTTP/1.1
> Host: sklearn-iris.kserve-test.example.com
> User-Agent: curl/7.61.1
> Accept: */*
> Content-Type: application/json
> Content-Length: 76
> 
* upload completely sent off: 76 out of 76 bytes
< HTTP/1.1 200 OK
< content-length: 21
< content-type: application/json
< date: Mon, 09 Jun 2025 08:05:31 GMT
< server: istio-envoy
< x-envoy-upstream-service-time: 5
< 
* Connection #0 to host 192.168.58.2 left intact
{"predictions":[1,1]}
```

{{% /notice %}}


