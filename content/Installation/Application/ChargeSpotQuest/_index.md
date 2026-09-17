+++
title = "Charge Spot Quest"
weight = 16
+++

### Overview

Charge Spot Quest is the 邻里互助·共享充电 UI + booking API. It is deployed via the 72602 ArgoCD GitOps pipeline using Helm chart `charge-spot-quest` (version `0.1.4`) with in-cluster SQLite.

* **ArgoCD Application**: `argocd/charge-spot-quest` (child of `argocd/ops-docs`)
* **Namespace**: `charge-spot`
* **Service**: `charge-spot-quest` (port 8080)
* **Ingress**: `charge.72602.space` (TLS via cert-manager)
* **Database**: SQLite PVC `charge-spot-quest-sqlite` (`1Gi`, `local-path`)

{{% children depth="2" description="true" showhidden="true" %}}
