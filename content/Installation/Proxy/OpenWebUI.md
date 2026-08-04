+++
title = 'Open WebUI'
date = 2026-05-12T15:00:59+08:00
weight = 15
+++

### Archived

The 72602 OpenWebUI deployment is retired and has no current installation
route. `argocd/open-webui` does not exist, and the `ai` namespace has no
OpenWebUI resources. `txt2img.agent.72602.online` is retired and has no
working endpoint; its DNS record, certificate, TLS Secret, and unreferenced
data claims were removed.

The repository file
`manifests/application/open-webui.yaml` is a historical, non-deployed
manifest. It is not consumed by the current GitOps setup and still points to
the retired route. Do not use it as an installation source.

### Historical Record (2026-05)

The service was previously deployed in the 72602 cluster through an ArgoCD
Helm Application in namespace `ai`:

- Route: `txt2img.agent.72602.online` (now retired)
- Helm chart: `open-webui`, version `14.5.0`
- Image: `m.daocloud.io/ghcr.io/open-webui/open-webui:0.9.5`
- AI backend: `sub2api.application.svc:8080/v1` (OpenAI-compatible)
- WebSocket manager: shared Redis in namespace `storage`
- Persistence: SQLite on a 2Gi `local-path` PVC

Any commands or verification steps from the former deployment procedure are
historical and non-runnable. They are intentionally not reproduced here.
