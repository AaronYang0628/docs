+++
title = "Reloader"
+++


### Install
{{< tabs groupid="install" >}}
{{< tab title="📦helm✅" >}}

{{% notice style="transparent" %}}
```shell
helm repo add stakater https://stakater.github.io/stakater-charts
helm repo update
helm install reloader stakater/reloader
```
{{% /notice %}}
{{% notice style="important" title="Using AY Helm Mirror" expanded="false" %}} 
for more information, you can check 🔗[https://aaronyang0628.github.io/helm-chart-mirror/](https://aaronyang0628.github.io/helm-chart-mirror/)
```shell
helm repo add ay-helm-mirror https://aaronyang0628.github.io/helm-chart-mirror/charts
helm repo update
helm -n basic-components install reloader stakater/reloader
```
{{% /notice %}}

{{< /tab >}}
{{< tab title="🗃️k8s" >}}

{{% notice style="accent" %}}
```shell
kubectl apply -f https://raw.githubusercontent.com/stakater/Reloader/master/deployments/kubernetes/reloader.yaml
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
{{< /tabs >}}


### Usage
- For a **Deployment** called **foo** have a **ConfigMap** called **foo-configmap**. Then add this **annotation** to main metadata of your **Deployment**
  `configmap.reloader.stakater.com/reload: "foo-configmap"`

- For a **Deployment** called **foo** have a **Secret** called **foo-secret**. Then add this **annotation** to main metadata of your **Deployment**
  `secret.reloader.stakater.com/reload: "foo-secret"`

- After successful installation, your pods will get rolling updates when a change in data of configmap or secret will happen.



### Reference
For more information about reloader, please refer to [https://github.com/stakater/Reloader](https://github.com/stakater/Reloader)


