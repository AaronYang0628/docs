
+++
tags = ["Kafka", "Broker"]
title = 'Kafka Broker Invoke ISVC'
date = 2024-03-07T15:00:59+08:00
weight = 110
+++


```yaml
kubectl apply -n kserve-test -f - <<EOF
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: event-display
spec:
  template:
    spec:
      containers:
        - image: gcr.io/knative-releases/knative.dev/eventing/cmd/event_display
EOF
```



kubectl run curl-test --image=curlimages/curl -it --rm --restart=Never -- \
  -v "http://kafka-broker-ingress.knative-eventing.svc.cluster.local/kserve-test/first-broker" \
  -X POST \
  -H "Ce-Id: $(date +%s)" \
  -H "Ce-Specversion: 1.0" \
  -H "Ce-Type: test.type" \
  -H "Ce-Source: curl-test" \
  -H "Content-Type: application/json" \
  -d '{"test": "Broker is working"}'


cat <<EOF | kubectl apply -f -
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: kserve-access-for-knative
rules:
- apiGroups: ["serving.kserve.io"]
  resources: ["inferenceservices", "inferenceservices/status"]
  verbs: ["get", "list", "watch"]
EOF


cat <<EOF | kubectl apply -f -
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


kubectl -n kserve-test apply -f - << EOF
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: kserve-trigger
  namespace: kserve-test
spec:
  broker: first-broker
  filter:
    attributes:
      type: prediction-request
  subscriber:
    uri: http://first-torchserve.kserve-test.svc.cluster.local/v1/models/mnist:predict
EOF



export MASTER_IP=192.168.100.112
export KAFKA_BROKER_INGRESS_PORT=$(kubectl -n knative-eventing get service kafka-broker-ingress -o jsonpath='{.spec.ports[?(@.name=="http-container")].nodePort}')
curl -v "http://${MASTER_IP}:${KAFKA_BROKER_INGRESS_PORT}/kserve-test/first-broker" \
  -X POST \
  -H "Ce-Id: $(date +%s)" \
  -H "Ce-Specversion: 1.0" \
  -H "Ce-Type: prediction-request" \
  -H "Ce-Source: event-producer" \
  -H "Content-Type: application/json" \
  -d @./mnist-input.json 



export ISTIO_INGRESS_PORT=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.spec.ports[?(@.name=="http2")].nodePort}')
export SERVICE_HOSTNAME=$(kubectl -n kserve-test get inferenceservice first-torchserve  -o jsonpath='{.status.url}' | cut -d "/" -f 3)
# http://first-torchserve.kserve-test.example.com 
curl -v -H "Host: ${SERVICE_HOSTNAME}" -H "Content-Type: application/json" "http://${MASTER_IP}:${ISTIO_INGRESS_PORT}/v1/models/mnist:predict" -d @./mnist-input.json