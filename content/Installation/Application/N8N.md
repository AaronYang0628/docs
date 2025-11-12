+++
title = 'N8N'
date = 2024-03-07T15:00:59+08:00
weight = 14
+++

### 🚀Installation

{{< tabs groupid="xxxx" style="primary" title="Install By" icon="thumbtack" >}}


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