+++
title = "Sub2API"
tags = ["sub2api", "ai"]
+++

### Web Page
[<i class="fa-solid fa-link"></i> sub2api web page (https://sub2api.72602.space)](https://sub2api.72602.space)

### Current State

- Git owner: `argocd/ops-docs`, source `https://github.com/AaronYang0628/docs.git`, path `manifests`
- ArgoCD Application: `argocd/sub2api`
- Namespace: `application`
- OCI chart: `ghcr.io/ben-wangz/k8s-at-home-charts/sub2api` (`0.1.6`)
- Application image: `ghcr.io/wei-shaw/sub2api:0.1.168`
- Ingress host: `sub2api.72602.space`
- Ingress class: `nginx`
- TLS certificate: `Ready`
- External PostgreSQL: `postgresql.database.svc.cluster.local:5432` (`database/user: sub2api`)
- Application PVC: `sub2api-data`, `10Gi`, `local-path`, `RWO`
- Redis PVC: `8Gi`, `local-path`, `RWO`; AOF is enabled
- RollingUpdate: `maxUnavailable: 0`, `maxSurge: 1`

## Docs

{{%children depth="2" description="true" showhidden="true" %}}
