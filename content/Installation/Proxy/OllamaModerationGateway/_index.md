+++
title = "Ollama Moderation Gateway"
weight = 20
+++

### Overview

The Ollama Moderation Gateway was retired from the 72602 cluster on 2026-11-08. It is no longer deployed or available at `https://moderation.llm.72602.space`.

* **Git owner**: `argocd/ops-docs`, source path `manifests`
* **Final parent revision**: `a89ef003808032b0438df9b7c50424d1159b84b2`
* **Retired child Application**: `argocd/ollama-moderation-gateway`
* **Namespace**: `moderation` remains `Active`; shared namespace resources were not removed.

The child Application manifest was removed from Git and its finalizer cascaded the
tracked workload resources. The former installation page is retained as a
retirement record, not as an installation procedure.

{{% children depth="2" description="true" showhidden="true" %}}
