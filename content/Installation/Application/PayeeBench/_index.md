+++
title = "Payee Bench"
weight = 17
+++

### Overview

Payee Bench (码上交付) is a single-instance Alipay redemption-code shop deployed to 72602 through the `ops-docs` GitOps Application. Public host is `https://pay.72602.space`; state is SQLite on a `local-path` PVC.

* **ArgoCD Application**: parent `argocd/ops-docs` applies `manifests/payee-bench/`
* **Namespace**: `payee-bench`
* **Image**: `docker.io/library/payee-bench:669a90e` (imported into k3s containerd)
* **Service**: `payee-bench` (port 3000, ClusterIP)
* **Ingress**: `pay.72602.space` (TLS via `lets-encrypt`)
* **Database**: PVC `payee-bench-data` (`1Gi`, `local-path`), `/app/data/shop.sqlite`

{{% children depth="2" description="true" showhidden="true" %}}
