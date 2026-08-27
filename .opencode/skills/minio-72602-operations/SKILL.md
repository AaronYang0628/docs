---
name: minio-72602-operations
description: Use ONLY when operating MinIO in the 72602 cluster, including storage, console/API ingress, buckets, and upgrades.
---

# MinIO 72602 Operations

Operate the MinIO Application in namespace `storage`. Treat the object store
and its data volume as stateful infrastructure; applications consuming it own
their bucket-level intent.

## Fixed scope

- ArgoCD Application: `minio`.
- Namespace: `storage`.
- Public entrypoints: `console.minio.72602.space` and `api.minio.72602.space`.
- TLS, DNS, and ingress resources are shared with the cluster ingress/cert-manager path.

## Routine path

1. Read Application health, MinIO workload/service/endpoints, PVCs, and both public endpoint responses.
2. For a bucket or object issue, use the least-privileged existing admin path and report only metadata, never access keys or secret values.
3. For configuration or version changes, update the Git/ArgoCD source and inspect the rendered resource diff.
4. Verify pod readiness, storage binding, API/console reachability, and the affected application behavior.

## Mutation and rollback

Before changing credentials, buckets, storage, replication, or version, state
the exact target, current value, proposed value, blast radius, and rollback.
Use Git for deployment rollback; use an explicit object/data backup for data
rollback. Never delete MinIO PVCs or print access keys.
