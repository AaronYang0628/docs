+++
title = "Sub2API"
tags = ["sub2api", "ai"]
+++

### Web Page
[<i class="fa-solid fa-link"></i> sub2api web page (https://sub2api.72602.online)](https://sub2api.72602.online)

### Current State

- ArgoCD Application: `argocd/sub2api`
- Namespace: `ai`
- Chart: `ghcr.io/ben-wangz/k8s-at-home-charts/sub2api` (`0.1.1`)
- Ingress host: `sub2api.72602.online`
- Ingress class: `nginx`
- ClusterIssuer: `lets-encrypt`
- External PostgreSQL: `postgresql.database.svc.cluster.local:5432` (`database/user: sub2api`)

## Docs

{{%children depth="2" description="true" showhidden="true" %}}
