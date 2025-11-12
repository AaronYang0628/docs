+++
tags = ["TEMPLATE"]
title = 'Install MD TEMPLATE'
date = 2024-06-07T15:00:59+08:00
draft = true
weight = 270
+++


### 🚀Installation

{{< tabs groupid="xxxx" style="primary" title="Install By" icon="thumbtack" >}}

{{< tab title="📦Helm" style="transparent" >}}
  {{% include "content\Installation\SNIPPET\_helm_preliminary.md" %}}

  <p> <b>1.get helm repo </b></p>

  {{% notice style="transparent" %}}
  ```bash
  helm repo add xxxxx https://xxxx
  helm repo update
  ```
  {{% /notice %}}

  <p> <b>2.install chart </b></p>

  {{% notice style="transparent" %}}
  ```bash
  helm install xxxxx/chart-name --generate-name --version a.b.c
  ```
  {{% /notice %}}

  {{% notice style="important" title="Using AY Helm Mirror" %}} 
  {{% include "content\Installation\CICD\_helm_chart_mirror.md" %}}
  {{% /notice %}}

{{< /tab >}}

{{< tab title="🐙ArgoCD" style="transparent" >}}
  {{% include "content\Installation\SNIPPET\_argo_cd_preliminary.md" %}}

  <p> <b>1.prepare</b> `xxxxx-credientials.yaml` </p>

  {{% notice style="transparent" %}}
  ```yaml

  ```
  {{% /notice %}}

  <p> <b>2.prepare</b> `deploy-xxxxx.yaml` </p>

  {{% notice style="transparent" %}}
  ```yaml
  kubectl -n argocd apply -f -<< EOF
  apiVersion: argoproj.io/v1alpha1
  kind: Application
  metadata:
    name: xxxx
  spec:
    project: default
    source:
      repoURL: https://xxxxx
      chart: xxxx
      targetRevision: a.b.c
  EOF
  ```
  {{% /notice %}}

  <p> <b>3.sync by argocd</b></p>

  {{% notice style="transparent" %}}
  ```bash
  argocd app sync argocd/xxxx
  ```
  {{% /notice %}}

  {{% notice style="important" title="Using AY Helm Mirror" expanded="false" %}} 
  {{% include "content\Installation\SNIPPET\_helm_chart_mirror.md" %}}
  {{% /notice %}}
  {{% notice style="important" title="Using AY ACR Image Mirror" expanded="false" %}} 
  {{% include "content\Installation\SNIPPET\_acr_image_mirror.md" %}}
  {{% /notice %}}
  {{% notice style="tip" title="Using DaoCloud Mirror" expanded="false" %}} 
  {{% include "content\Installation\SNIPPET\_daocloud_image_mirror.md" %}}
  {{% /notice %}}

{{< /tab >}}


{{< tab title="🐳Docker" style="transparent" >}}
  {{% include "content\Installation\SNIPPET\_container_preliminary.md" %}}

  <p> <b>1.init server </b></p> 

  {{% notice style="transparent" %}}
  ```bash

  ```
  {{% /notice %}}
  
  {{% notice style="important" title="Using AY ACR Image Mirror" expanded="false" %}} 
  {{% include "content\Installation\SNIPPET\_acr_image_mirror.md" %}}
  {{% /notice %}}
  {{% notice style="tip" title="Using DaoCloud Mirror" expanded="false" %}} 
  {{% include "content\Installation\SNIPPET\_daocloud_image_mirror.md" %}}
  {{% /notice %}}

{{< /tab >}}


{{< tab title="♻️Argo Workflow" style="transparent" >}}
  {{% include "content\Installation\SNIPPET\_argo_wf_preliminary.md" %}}

  <p> <b>1.prepare `argocd-login-credentials` </b></p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl get namespaces database > /dev/null 2>&1 || kubectl create namespace database
  ```
  {{% /notice %}}


  <p> <b>2.apply rolebinding to k8s </b></p>

  {{% notice style="transparent" %}}
  {{% include "content\Installation\SNIPPET\_argo_wf_rbac.md" %}}
  {{% /notice %}}

  <p> <b>4.prepare `deploy-xxxx-flow.yaml` </b></p>

  {{% notice style="transparent" %}}
  ```yaml

  ```
  {{% /notice %}}


  <p> <b>5.subimit to argo workflow client</b></p> 

  {{% notice style="transparent" %}}
  ```bash
  argo -n business-workflows submit deploy-xxxx-flow.yaml
  ```
  {{% /notice %}}


  <p> <b>7.decode password</b></p> 

  {{% notice style="transparent" %}}
  ```bash
  kubectl -n application get secret xxxx-credentials -o jsonpath='{.data.xxx-password}' | base64 -d
  ```
  {{% /notice %}}

{{< /tab >}}

{{< tab title="📑manifests" style="transparent" >}}
  {{% include "content\Installation\SNIPPET\_manifests_preliminary.md" %}}

  <p> <b>1.init server </b></p> 

  {{% notice style="transparent" %}}
  ```bash

  ```
  {{% /notice %}}
  
  {{% notice style="important" title="Using AY ACR Image Mirror" expanded="false" %}} 
  {{% include "content\Installation\SNIPPET\_acr_image_mirror.md" %}}
  {{% /notice %}}
  {{% notice style="tip" title="Using DaoCloud Mirror" expanded="false" %}} 
  {{% include "content\Installation\SNIPPET\_daocloud_image_mirror.md" %}}
  {{% /notice %}}

{{< /tab >}}


{{< /tabs >}}



### 🛎️FAQ

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