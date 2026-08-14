---
name: redis-shared-72602-operations
description: Use ONLY when operating the shared Redis service in the 72602 cluster, including persistence, connectivity, upgrades, and consumer boundaries.
---

# Shared Redis 72602 Operations

Operate the `storage/redis-shared` service only. It is distinct from the
Redis workload bundled with Sub2API; do not infer one service's state from the
other.

## Fixed scope

- ArgoCD Application: `redis-shared`.
- Namespace: `storage`.
- Consumer ownership and database selection must be read from the requesting application's skill before changing Redis.
- Sub2API's Redis is handled by `sub2api-72602-operations`, not this skill.

## Routine path

1. Read the Application, StatefulSet, Service, Pod, PVC, persistence mode, and endpoints.
2. Check Redis health and recent logs without printing passwords or connection URLs.
3. For a consumer issue, verify the consumer's configured host and Redis DB before changing the shared service.
4. For a GitOps change, update the source and inspect the rendered diff before convergence.
5. Verify readiness, persistence/PVC binding, endpoint connectivity, and the consumer's health.

## Mutation and rollback

Before changing Redis configuration, authentication, persistence, storage, or
version, state target, current value, proposed value, blast radius, and
rollback. Use Git for configuration rollback. Never delete the PVC to recover
from a routine failure and never expose Redis credentials.
