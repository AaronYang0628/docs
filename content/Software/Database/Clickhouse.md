+++
tags = ["Clickhouse"]
title = 'Install Clickhouse'
date = 2024-03-07T15:00:59+08:00
weight = 3
+++


### Installation

{{< tabs groupid="prometheus" style="primary" title="Install By" icon="thumbtack" >}}

{{< tab title="Helm" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  2. Helm has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>

{{< /tab >}}

{{< tab title="ArgoCD" style="transparent">}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  2. argoCD has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  3. ingres has installed on argoCD, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>



{{< /tab >}}


{{< tab title="Docker Compose" style="default" >}}
  <p> <b>Preliminary </b></p>
  1. Docker has installed, if not check 🔗<a href="docs/software/container/docker/index.html" target="_blank">link</a> </p></br>
   

  {{% notice style="important" title="Using Proxy" %}} 
  you can run an addinational **daocloud** image to accelerate your pulling, check [Daocloud Proxy](daocloud/index.html)
  {{% /notice %}}

  <p> <b>1.init server </b></p>

  {{% notice style="transparent" %}}
  ```bash
  mkdir -p clickhouse/{data,logs}
  podman run --rm \
      --ulimit nofile=262144:262144 \
      --name clickhouse-server \
      -p 18123:8123 \
      -p 19000:9000 \
      -v $(pwd)/clickhouse/data:/var/lib/clickhouse \
      -v $(pwd)/clickhouse/logs:/var/log/clickhouse-server \
      -e CLICKHOUSE_DB=my_database \
      -e CLICKHOUSE_DEFAULT_ACCESS_MANAGEMENT=1 \
      -e CLICKHOUSE_USER=ayayay \
      -e CLICKHOUSE_PASSWORD=123456 \
      -d m.daocloud.io/docker.io/clickhouse/clickhouse-server:23.11.5.29-alpine
  ```
  {{% /notice %}}

  <p> <b>2.check dashboard </b></p>
  And then you can visit 🔗<a href="http://localhost:18123" target="_blank">http://localhost:18123</a>

  <p> <b>3.use cli api </b></p>
  And then you can visit 🔗<a href="http://localhost:19000" target="_blank">http://localhost:19000</a>
  {{% notice style="transparent" %}}
  ```bash
  podman run --rm \
    --entrypoint clickhouse-client \
    -it m.daocloud.io/docker.io/clickhouse/clickhouse-server:23.11.5.29-alpine \
    --host host.containers.internal \
    --port 19000 \
    --user ayayay \
    --password 123456 \
    --query "select version()"
  ```
  {{% /notice %}}

  <p> <b>4.use visual client </b></p>
  {{% notice style="transparent" %}}
  ```bash
  podman run --rm -p 8080:80 -d m.daocloud.io/docker.io/spoonest/clickhouse-tabix-web-client:stable
  ```
  {{% /notice %}}

{{< /tab >}}

{{< /tabs >}}



### FAQ

{{% expand title="Q1: Show me almost **endless** possibilities" %}}
You can add standard markdown syntax:

- multiple paragraphs
- bullet point lists
- _emphasized_, **bold** and even **_bold emphasized_** text
- [links](https://example.com)
- etc.

```plaintext
...and even source code
```

> the possibilities are endless (almost - including other shortcodes may or may not work)
{{% /expand %}}


{{% expand title="Q2: Show me almost **endless** possibilities" %}}
You can add standard markdown syntax:

- multiple paragraphs
- bullet point lists
- _emphasized_, **bold** and even **_bold emphasized_** text
- [links](https://example.com)
- etc.

```plaintext
...and even source code
```

> the possibilities are endless (almost - including other shortcodes may or may not work)
{{% /expand %}}