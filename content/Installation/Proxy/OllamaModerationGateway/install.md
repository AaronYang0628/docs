+++
title = "Retirement Record"
description = "Retirement record for the 72602 Ollama Moderation Gateway"
+++

### Retirement

The Ollama Moderation Gateway was retired on 2026-11-08. Do not run the former
installation or Secret-creation commands from repository history.

### GitOps changes

- `250ef03fd8f07f28df99adf42715b395c891aa5b`: added cascade finalizers to
  both child Applications.
- `6e8e61a01e7822e4d45fcd3bc13bc1e0f3a3fe17`: removed the Roaminal bootstrap
  Job before service retirement.
- `4f08ce5b6b485456194ed9a879350ee1451da912`: restored the chart-required
  single-replica value after the pinned chart rejected zero replicas.
- `707953229eff9ed25b6b20fe94e26882f5ec96b2`: disabled Roaminal persistence.
- `b51c24709b7d8800d7d565f610a86a75343e5f15`: made Roaminal pruning occur
  after workload replacement.
- `a89ef003808032b0438df9b7c50424d1159b84b2`: removed both child Application
  manifests from the parent source.

The pinned Roaminal chart revision requires exactly one replica and rejects a
zero-replica render. With persistence disabled, the Deployment was reconciled
to an `emptyDir` data volume; a temporary scale to zero released Kubernetes PVC
protection so Argo CD could prune the PVC and local-path PV. No PVC was deleted
directly.

### Verification

- `argocd/ops-docs` is `Synced/Healthy` at revision
  `a89ef003808032b0438df9b7c50424d1159b84b2`.
- Both child Applications, their Deployments, Services, Ingresses,
  Certificates, PVC, and PV are absent.
- The `moderation` and `roaminal` namespaces remain `Active`, including their
  default ServiceAccounts and `kube-root-ca.crt` ConfigMaps.
- The former moderation public route returns HTTP `404`; the former Roaminal
  host has no cluster Ingress and the public edge returns an empty-body default
  response.
- Service-owned runtime and TLS Secrets were deleted only after the resource
  absence checks. Secret data was never read, and no backup was created.

### Rollback guidance

There is no rollback for the deleted PVC/PV data or Secrets. Recreating the
service would require a new reviewed Git source commit and externally supplied
runtime credentials; do not restore the retired child manifests by direct
cluster apply.
