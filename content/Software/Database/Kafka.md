+++
tags = ["Kafka"]
title = 'Install Kafka'
date = 2024-03-07T15:00:59+08:00
weight = 20
+++

## Preliminary
- Kubernetes has installed, if not check [link](kubernetes/command/install/index.html)
- argoCD has installed, if not check [link](argo/argo-cd/argocd/index.html)

## Steps

### 1. prepare deploy-kafka.yaml
{{< tabs groupid="kafka">}}
  {{% tab title="ArgoCD" %}}
- create file `deploy-kafka-in-argocd.yaml` with content below
```yaml

```
  {{% /tab  %}}

  {{% tab title="helm"%}}
- create file `deploy-kafka-in-helm.yaml` with content below
```yaml

```
  {{% /tab %}}

  {{% tab title="docker"%}}
- create file `deploy-kafka-in-docker.yaml` with content below
```yaml

```
  {{% /tab %}}
{{< /tabs >}}


### 2. deploy
{{< tabs groupid="kafka">}}
  {{% tab title="ArgoCD" %}}
then you can apply it to k8s
```shell
kubectl -n argocd apply -f deploy-kafka-in-argocd.yaml
```

and sync it by argocd
```shell
argocd app sync argocd/kafka
```
  {{% /tab  %}}

  {{% tab title="helm"%}}
```yaml

```
  {{% /tab %}}

  {{% tab title="docker"%}}
```yaml

```
  {{% /tab %}}
{{< /tabs >}}
