+++
tags = ["Kafka"]
title = 'Install Kafka Broker'
date = 2024-03-07T15:00:59+08:00
weight = 9
+++

### About
![broker](../../../../../../images/content/kubernetes/knative/broker.png)

- Source, curl, kafkaSource, 
- Broker
- Trigger
- Sink: ksvc, isvc

### Install a Channel (messaging) layer
```shell
kubectl apply -f https://github.com/knative-extensions/eventing-kafka-broker/releases/download/knative-v1.18.0/eventing-kafka-controller.yaml
```

{{% notice style="tip" title="Expectd Output" icon="check" expanded="false"%}}
```plaintext
configmap/kafka-broker-config created
configmap/kafka-channel-config created
customresourcedefinition.apiextensions.k8s.io/kafkachannels.messaging.knative.dev created
customresourcedefinition.apiextensions.k8s.io/consumers.internal.kafka.eventing.knative.dev created
customresourcedefinition.apiextensions.k8s.io/consumergroups.internal.kafka.eventing.knative.dev created
customresourcedefinition.apiextensions.k8s.io/kafkasinks.eventing.knative.dev created
customresourcedefinition.apiextensions.k8s.io/kafkasources.sources.knative.dev created
clusterrole.rbac.authorization.k8s.io/eventing-kafka-source-observer created
configmap/config-kafka-source-defaults created
configmap/config-kafka-autoscaler created
configmap/config-kafka-features created
configmap/config-kafka-leader-election created
configmap/kafka-config-logging created
configmap/config-namespaced-broker-resources created
configmap/config-tracing configured
clusterrole.rbac.authorization.k8s.io/knative-kafka-addressable-resolver created
clusterrole.rbac.authorization.k8s.io/knative-kafka-channelable-manipulator created
clusterrole.rbac.authorization.k8s.io/kafka-controller created
serviceaccount/kafka-controller created
clusterrolebinding.rbac.authorization.k8s.io/kafka-controller created
clusterrolebinding.rbac.authorization.k8s.io/kafka-controller-addressable-resolver created
deployment.apps/kafka-controller created
clusterrole.rbac.authorization.k8s.io/kafka-webhook-eventing created
serviceaccount/kafka-webhook-eventing created
clusterrolebinding.rbac.authorization.k8s.io/kafka-webhook-eventing created
mutatingwebhookconfiguration.admissionregistration.k8s.io/defaulting.webhook.kafka.eventing.knative.dev created
mutatingwebhookconfiguration.admissionregistration.k8s.io/pods.defaulting.webhook.kafka.eventing.knative.dev created
secret/kafka-webhook-eventing-certs created
validatingwebhookconfiguration.admissionregistration.k8s.io/validation.webhook.kafka.eventing.knative.dev created
deployment.apps/kafka-webhook-eventing created
service/kafka-webhook-eventing created
```

{{% /notice %}}

```shell
kubectl apply -f https://github.com/knative-extensions/eventing-kafka-broker/releases/download/knative-v1.18.0/eventing-kafka-channel.yaml
```

{{% notice style="tip" title="Expectd Output" icon="check" expanded="false"%}}
```
configmap/config-kafka-channel-data-plane created
clusterrole.rbac.authorization.k8s.io/knative-kafka-channel-data-plane created
serviceaccount/knative-kafka-channel-data-plane created
clusterrolebinding.rbac.authorization.k8s.io/knative-kafka-channel-data-plane created
statefulset.apps/kafka-channel-dispatcher created
deployment.apps/kafka-channel-receiver created
service/kafka-channel-ingress created
```
{{% /notice %}}

### Install a Broker layer

```shell
kubectl apply -f https://github.com/knative-extensions/eventing-kafka-broker/releases/download/knative-v1.18.0/eventing-kafka-broker.yaml
```

{{% notice style="tip" title="Expectd Output" icon="check" expanded="false"%}}
```
configmap/config-kafka-broker-data-plane created
clusterrole.rbac.authorization.k8s.io/knative-kafka-broker-data-plane created
serviceaccount/knative-kafka-broker-data-plane created
clusterrolebinding.rbac.authorization.k8s.io/knative-kafka-broker-data-plane created
statefulset.apps/kafka-broker-dispatcher created
deployment.apps/kafka-broker-receiver created
service/kafka-broker-ingress created
```
{{% /notice %}}

{{% notice style="important" title="Reference" %}} 
for more information, you can check 🔗[https://knative.dev/docs/eventing/brokers/broker-types/kafka-broker/](https://knative.dev/docs/eventing/brokers/broker-types/kafka-broker/)
{{% /notice %}}


{{% expand title="if you cannot find `kafka-channel-dispatcher`" %}}
> please check sts
```
root@ay-k3s01:~# kubectl -n knative-eventing  get sts
NAME                       READY   AGE
kafka-broker-dispatcher    1/1     19m
kafka-channel-dispatcher   0/0     22m
```

some sts replia is 0, please check
{{% /expand %}}







### [[Optional]]() Install Eventing extensions
- kafka sink
```shell
kubectl apply -f https://github.com/knative-extensions/eventing-kafka-broker/releases/download/knative-v1.18.0/eventing-kafka-sink.yaml
```

{{% notice style="important" title="Reference" %}} 
for more information, you can check 🔗[https://knative.dev/docs/eventing/sinks/kafka-sink/](https://knative.dev/docs/eventing/sinks/kafka-sink/)
{{% /notice %}}


- kafka source
```shell
kubectl apply -f https://github.com/knative-extensions/eventing-kafka-broker/releases/download/knative-v1.18.0/eventing-kafka-source.yaml
```

{{% notice style="important" title="Reference" %}} 
for more information, you can check 🔗[https://knative.dev/docs/eventing/sources/kafka-source/](https://knative.dev/docs/eventing/sources/kafka-source/)
{{% /notice %}}