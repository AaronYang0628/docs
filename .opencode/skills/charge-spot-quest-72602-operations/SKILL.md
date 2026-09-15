---
name: charge-spot-quest-72602-operations
description: Use ONLY when operating Charge Spot Quest in the 72602 cluster, including its Helm chart, ArgoCD deployment, SQLite PVC, Ingress, TLS certificate, or public booking API.
---

# Charge Spot Quest 72602 Operations

Operate the `charge-spot-quest` workload only in the 72602 cluster. It is a
single-replica FastAPI booking API plus same-origin Vite UI with in-cluster
SQLite. Delegate live
Kubernetes work to `72602-k3s-maintainer` and keep deployment configuration on
the GitOps path.

## Fixed scope and ownership

- Argo CD Application: `charge-spot-quest` in namespace `argocd`.
- Workload namespace: `charge-spot`.
- GitOps manifest: `manifests/charge-spot-quest-argocd.yaml` in the docs repository.
- Application chart: `charts/charge-spot-quest` in `https://github.com/AaronYang0628/charge-spot-quest`.
- Public endpoint: `https://charge.72602.space`.
- Ingress class: `nginx`; TLS issuer: `lets-encrypt`; TLS Secret: `charge.72602.space-tls`.
- Service: `charge-spot-quest`, port `8080`.
- Persistence: SQLite PVC `charge-spot-quest-sqlite`, size `1Gi`, storage class `local-path`.
- Database: in-cluster SQLite only. Do not enable bundled PostgreSQL or attach the shared 72602 PostgreSQL.

Treat the chart revision, image digest, ArgoCD revision, Certificate state,
Pod image, PVC bind, and endpoint health as dynamic. Resolve them from the
GitOps source and live resources for every release or incident.

## Read path

1. Confirm execution host and use the canonical `72602-minipc-local` cluster path.
2. Read the ArgoCD Application, Deployment, Pod, Service, EndpointSlice, Ingress, Certificate, PVC, and recent events. Read Secret metadata only; never read Secret data.
3. Confirm the Deployment uses the pinned GHCR digest, port `8080`, `/health` liveness, `/readyz` readiness, one replica, SQLite mode, and no PostgreSQL workload.
4. Test `https://charge.72602.space/` for HTML, plus `/health` and `/readyz` with strict TLS.

## Mutation and rollback

Before every cluster mutation, state the exact target, current value, proposed
value, blast radius, and rollback.

- Git owns the ArgoCD Application and chart values. Change the source, inspect the rendered diff, commit only intended files, and let the parent `ops-docs` Application converge it.
- Do not apply the child Deployment, Service, Ingress, or PVC directly. Do not create a second Helm release outside ArgoCD.
- Do not delete the SQLite PVC as a recovery step. Booking data lives only on that volume.
- Roll back deployment configuration with a new Git revert to the previously verified manifest. Preserve the existing TLS Secret and SQLite PVC during ordinary rollback.
- If the image cannot be pulled anonymously, stop before syncing and resolve GHCR visibility or use a separately managed imagePullSecret; do not commit credentials.

## Configuration contract

- Image repository: `ghcr.io/aaronyang0628/charge-spot-quest`
- Image tag: `0.1.1`
- SQLite path inside the container: `/app/data/chargespot.sqlite`
- Resources: CPU `200m`, memory `512Mi` requests and limits
- Ingress host: `charge.72602.space`

## Verification

After GitOps convergence:

1. Verify `argocd/charge-spot-quest` is `Synced/Healthy` and the Deployment rollout is complete.
2. Verify the Pod is Ready, has no restart loop, and the EndpointSlice contains the Service endpoint.
3. Verify the SQLite PVC is Bound at `1Gi`.
4. Verify no PostgreSQL Pod exists in namespace `charge-spot`.
5. Verify the Certificate is `Ready` and the HTTPS endpoint presents the host certificate.
6. Run `curl -fsS https://charge.72602.space/health` and `curl -fsS https://charge.72602.space/readyz`.
7. Confirm `https://charge.72602.space/` returns HTML (`text/html`), not `{"detail":"Not Found"}`.
