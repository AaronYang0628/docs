+++
title = 'On K8s Operator'
date = 2024-04-07T15:00:59+08:00
+++


### Install
```bash 
helm repo add flink-operator-repo https://downloads.apache.org/flink/flink-kubernetes-operator-<OPERATOR-VERSION>/
# helm repo add flink-operator-repo https://downloads.apache.org/flink/flink-kubernetes-operator-1.11.0/

helm install flink-kubernetes-operator flink-operator-repo/flink-kubernetes-operator

# helm install flink-kubernetes-operator flink-operator-repo/flink-kubernetes-operator --set image.repository=apache/flink-kubernetes-operator --set webhook.create=false
```
To find the list of stable versions please visit https://flink.apache.org/downloads.html


{{% children containerstyle="div" style="h4" depth="1" description="false" %}}