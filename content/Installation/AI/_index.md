+++
title = '72602 AI Stack'
date = 2026-05-12T15:00:59+08:00
weight = 1
+++

### Architecture Overview

```
Internet
  ├── ops.agent.72602.online  ← opencode web (AI Agent Chat)
  │     └── oauth2-proxy → opencode-web (DeepSeek)
  │           ├── 72602-k3s-maintainer (kubectl)
  │           └── hugo-doc-maintainer (git push)
  │
  ├── txt2img.agent.72602.online  ← Open WebUI (Chat UI)
  │     └── sub2api backend (DeepSeek V4 Flash/Pro)
  │
  └── ops.docs.72602.online  ← Hugo Docs Site
        └── GitHub Pages mirror (accelerated in China)

Internal:
  sub2api.application.svc:8080/v1  ← OpenAI-compatible API proxy
  redis-shared-master.storage.svc:6379  ← Shared Redis (all apps)
  postgresql.database.svc:5432  ← Shared PostgreSQL
```

### Component Map

| Service | Domain / Host | Deploy | ArgoCD App | Namespace |
|---|---|---|---|---|
| opencode web | `ops.agent.72602.online` | ArgoCD (manifests) | `ops-agent` | application |
| Open WebUI | `txt2img.agent.72602.online` | ArgoCD (Helm) | `open-webui` | ai |
| Hugo Docs | `ops.docs.72602.online` | ArgoCD (manifests) | `ops-docs` | application |
| sub2api | `sub2api.72602.online` | ArgoCD (Helm) | `sub2api` | application |
| Redis | `redis-shared-master.storage` | ArgoCD (Helm) | `redis-shared` | storage |
| PostgreSQL | `postgresql.database` | ArgoCD (Helm) | `postgresql` | database |

### Agents

| Agent | Role | Tools |
|---|---|---|
| 72602-k3s-maintainer | 集群 SRE | kubectl, helm, argocd |
| hugo-doc-maintainer | 文档维护 | content/ edit, git commit/push |

### Network

- **Proxy**: `HTTP_PROXY=http://100.107.240.120:7890` (cluster egress)
- **GitHub加速**: `ghfast.top` URL rewrite + `NO_PROXY` bypass
- **镜像加速**: `m.daocloud.io/docker.io` / `m.daocloud.io/ghcr.io`
