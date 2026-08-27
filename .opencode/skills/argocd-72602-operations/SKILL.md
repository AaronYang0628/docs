---
name: argocd-72602-operations
description: Use ONLY when operating Argo CD or its Applications in the 72602 cluster, including sync, health, history, and GitOps ownership.
---

# Argo CD 72602 Operations

Operate the `argocd` Application and Argo CD control plane in the 72602
cluster. Argo CD is the deployment controller; Git or the declared chart
source is the configuration owner.

## Fixed scope

- Application: `argocd` in namespace `argocd`.
- Cluster context: `default` on `72602-minipc`.
- Use the Argo CD CLI from the Ops Agent Pod with `--insecure --grpc-web`.
- Child Applications are not permission to patch their live resources.

## Routine path

1. Read the named Application's `spec.source`, `spec.destination`, sync policy, Sync status, Health status, and current operation.
2. Locate the owning Git manifest or declared chart values before proposing a change.
3. For a GitOps change, edit the source, run the repository's validation, obtain the commit with `git rev-parse`, and push it. Do not hand-type revisions.
4. Wait for automated convergence; use manual sync only when the user explicitly requests it or the operation requires it.
5. Verify Application `Synced/Healthy`, operation result, rendered resources, and the affected workload separately.

## Mutation and rollback

Before a sync, source change, project/RBAC change, or resource deletion, state
the exact target, current value, proposed value, blast radius, and rollback.
Rollback Git-owned resources with a new Git revert or a reviewed source
revision. Do not use `kubectl apply`, `rollout undo`, or PVC deletion as a
second ownership path.

Never read or print Secret data, tokens, passwords, or provider credentials.
