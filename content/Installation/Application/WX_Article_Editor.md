+++
title = 'Wechat Markdown Editor'
date = 2024-03-07T15:00:59+08:00
weight = 14
+++

### Preliminary
- Kubernetes has installed, if not check 🔗[link](/docs/kubernetes/cluster/index.html)
- argoCD has installed, if not check 🔗[link](/docs/installation/cicd/argocd/)


### Install
{{< tabs groupid="install" >}}
{{< tab title="📦helm" >}}

{{% notice style="accent" %}}
```shell
```
{{% /notice %}}
{{% notice style="important" title="Using AY Helm Mirror" expanded="false" %}} 
for more information, you can check 🔗[https://aaronyang0628.github.io/helm-chart-mirror/](https://aaronyang0628.github.io/helm-chart-mirror/)
```shell
helm repo add ay-helm-mirror https://aaronyang0628.github.io/helm-chart-mirror/charts
helm repo update
helm install ay-helm-mirror/xxxxx
```
{{% /notice %}}

{{< /tab >}}
{{< tab title="🗃️k8s" >}}

{{% notice style="accent" %}}
```shell

```
{{% /notice %}}
{{% notice style="important" title="Using AY Gitee Mirror" expanded="false" %}} 
```shell
kubectl apply -f https://gitee.com/aaron2333/aaaa/raw/main/bbbb.yaml
```
{{% /notice %}}
{{% notice style="important" title="Using AY ACR Mirror" expanded="false" %}} 
```shell
docker pull crpi-wixjy6gci86ms14e.cn-hongkong.personal.cr.aliyuncs.com/ay-mirror/xxxx
```
{{% /notice %}}
{{% notice style="tip" title="Using DaoCloud Mirror" expanded="false" %}} 
```shell
docker pull m.daocloud.io/docker.io/library/xxxx
```
{{% /notice %}}

{{< /tab >}}
{{< tab title="🐳docker" >}}

{{% notice style="accent" %}}
```shell
```
{{% /notice %}}
{{% notice style="important" title="Using AY ACR Mirror" expanded="false" %}} 
```shell
docker pull crpi-wixjy6gci86ms14e.cn-hongkong.personal.cr.aliyuncs.com/ay-mirror/xxxx
```
{{% /notice %}}
{{% notice style="tip" title="Using DaoCloud Mirror" expanded="false" %}} 
```shell
docker pull m.daocloud.io/docker.io/library/xxxx
```
{{% /notice %}}

{{< /tab >}}
{{< tab title="🐙argocd" >}}

{{% notice style="accent" %}}
```shell
```
{{% /notice %}}
{{% notice style="important" title="Using AY Helm Mirror" expanded="false" %}} 
for more information, you can check 🔗[https://aaronyang0628.github.io/helm-chart-mirror/](https://aaronyang0628.github.io/helm-chart-mirror/)
```shell
helm repo add ay-helm-mirror https://aaronyang0628.github.io/helm-chart-mirror/charts
```
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: xxxx
spec:
  project: default
  source:
    repoURL: https://aaronyang0628.github.io/helm-chart-mirror/charts
    chart: xxxx
    targetRevision: a.b.c
```
{{% /notice %}}

{{< /tab >}}
{{< /tabs >}}