---
name: payee-bench-72602-operations
description: Use when deploying, upgrading, backing up, or diagnosing payee-bench or pay.72602.space in 72602, or cleaning its accidental ZJLAB deployment.
---

# Payee Bench 72602 Operations

Own the payee-bench application, its SQLite data, runtime Secret, and public Ingress. The 72602 deployment is the only intended production location.

## Ownership

- Argo CD child Application: `argocd/payee-bench`, declared by the `ops-docs` parent from `manifests/payee-bench-argocd.yaml`.
- Namespace: `payee-bench`.
- Runtime Secret: `payee-bench-runtime`, created outside Git; never print or read its data.
- SQLite: one replica only, `Recreate` rollout strategy, persistent PVC mounted at `/app/data`. The production database is `/app/data/shop.sqlite`.
- Service: ClusterIP port 3000 only. Public traffic enters through the shared `nginx` Ingress at `https://pay.72602.space`, with TLS issued by `lets-encrypt`.
- GitOps source: `/home/aaron/Ops/docs`; the parent `ops-docs` Application manages child Application declarations. Application code and image releases remain owned by the `payee-bench` repository.

## Routine read

1. Confirm the execution host and 72602 target using the approved SSH alias contract in `OPS_AGENT.md`.
2. Read the child Application source, destination, revision, sync and health status before changing its source.
3. Inspect Deployment, Pods, Service, PVC, Ingress, Certificate and recent events in `payee-bench`. Read Secret names and key names only.
4. Check `/api/health`, `/api/config` boolean fields, strict HTTPS, and the certificate readiness. Never print environment values, order credentials, redemption codes, or buyer pickup tokens.

## Mutation

- Change Git-owned resources in their declared source and let Argo CD converge. Do not apply a second live copy with `kubectl` or Helm.
- Create or update `payee-bench-runtime` from a protected input channel. Keep it outside Git and never put secret values in arguments, logs, or reports.
- Preserve `CARD_ENCRYPTION_KEY` with its matching database. Back up SQLite consistently before data migration or restore, including WAL/SHM files when present. Keep the single-replica constraint.
- Use `aliyun-72602-operations` before changing AliDNS. Use `ingress-nginx-72602-operations` for shared ingress changes and `cert-manager-72602-operations` for issuer/controller changes; application Ingress changes remain owned here.
- A production payment test may create at most the user-authorized test order. Never claim a real payment completed until the provider confirms payment; buyer-side authentication and checkout are completed by the user.

## ZJLAB migration cleanup

The accidental deployment was recorded as Namespace, Service, Endpoints and Ingress `payee-bench` in the ZJLAB cluster, with the endpoint pointing to `10.15.49.212:3000`. Before cleanup, verify the ZJLAB cluster identity, inspect all namespaced resources and save their manifests. Remove only objects owned by this application after the 72602 copy is verified. Preserve the source `.env` and SQLite database until migration and validation finish; remove temporary runtime artifacts only after a protected backup exists.

## Verification and rollback

- Require Argo CD `Synced/Healthy`, one Ready application Pod, a Bound PVC, correct internal endpoint, Ready certificate, and strict HTTPS health.
- Roll back Git-owned resources with a reviewed Git revert and Argo CD convergence. Preserve the PVC and runtime Secret during rollback. Restore SQLite only from a verified backup with its matching `CARD_ENCRYPTION_KEY`.
- For the one-time ZJLAB cleanup, retain the saved manifests and exact deleted resource names until 72602 is verified; do not remove other namespaces, ingress controllers, tunnels, firewall rules, or ECS configuration.
