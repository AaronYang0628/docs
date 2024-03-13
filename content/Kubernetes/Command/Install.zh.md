+++
title = 'Install Kubernetes'
date = 2024-03-07T15:00:59+08:00
+++

There are many ways to build a kubernetes cluster.

{{< tabs groupid="install" >}}
{{% tab title="kind" %}}
```shell
mkdir -p $HOME/bin \
&& export PATH="$HOME/bin:$PATH" \
&& curl -o kind -L https://resource-ops.lab.zjvis.net:32443/binary/kind/v0.20.0/kind-linux-amd64 \
&& chmod u+x kind && mv kind $HOME/bin \
&& curl -o kubectl -L https://resource-ops.lab.zjvis.net:32443/binary/kubectl/v1.21.2/bin/linux/amd64/kubectl \
&& chmod u+x kubectl && mv kubectl $HOME/bin
```
{{% /tab %}}
{{% tab title="minkube" %}}
```xml
<Hello>World</Hello>
```
{{% /tab %}}
{{% tab title="normal" %}}
```properties
Hello = World
```
{{% /tab %}}
{{< /tabs >}}


asdsadsadadsadsada

{{< tabs groupid="install" >}}
{{% tab title="kind" %}}
```json
{
  "Hello": "World"
}
```
{{% /tab %}}
{{% tab title="minkube" %}}
```xml
<Hello>World</Hello>
```
{{% /tab %}}
{{% tab title="normal" %}}
```properties
Hello = World
```
{{% /tab %}}
{{< /tabs >}}