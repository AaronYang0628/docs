+++
title = 'Resource CheatSheet'
date = 2025-03-07T15:00:59+08:00
weight = 18
+++

### Create Secret From Literal
```shell
kubectl -n application create secret generic xxxx-secrets \
  --from-literal=xxx_uri='https://in03-891eca6c21bd4e5.serverless.aws-eu-central-1.cloud.zilliz.com' \
  --from-literal=xxxx_token='<$the uncoded value, do not base64 and paste here>' \
  --from-literal=tongyi_api_key='sk-xxxxxxxxxxx'
```

### Forward external service
```yaml
kubectl -n basic-components apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: proxy-server-service
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 32080
    protocol: TCP
    name: http
---
kubectl -n basic-components apply -f - <<EOF
apiVersion: v1
kind: Endpoints
metadata:
  name: proxy-server-service
subsets:
  - addresses:
    - ip: "47.xxx.xxx.xxx"
    ports:
    - port: 32080
      protocol: TCP
      name: http
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: proxy-server-ingress
  annotations:
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "300"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "300"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "300"
spec:
  ingressClassName: nginx
  rules:
  - host: server.proxy.72602.online
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: proxy-server-service
            port:
              number: 80
EOF
```