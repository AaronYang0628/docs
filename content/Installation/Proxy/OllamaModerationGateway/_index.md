+++
title = "Ollama Moderation Gateway"
weight = 20
+++

### Overview

The Ollama Moderation Gateway provides an OpenAI-compatible moderation endpoint backed by Ollama models. It is deployed via the 72602 ArgoCD GitOps pipeline using the Helm chart `ollama-moderation-gateway` (version `0.1.0`).

* **ArgoCD Application**: `argocd/ollama-moderation-gateway` (child of `argocd/ops-docs`)
* **Namespace**: `moderation`
* **Service**: `ollama-moderation-gateway` (port 8000)
* **Ingress**: `moderation.llm.72602.space` (TLS via cert-manager)

**Current Operational State**: Deployment `ollama-moderation-gateway` desired replicas: **3**, available replicas: **3**. Service reports **three Ready endpoints**. Single-node resource metrics are healthy. The image, runtime configuration and Ingress remain unchanged; only `replicaCount` was changed.

{{% children depth="2" description="true" showhidden="true" %}}
