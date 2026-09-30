---
name: zjlab-prometheus-operations
description: Use ONLY when operating the independent ZJLAB Prometheus deployment or its remote-write forwarding to 72602.
---

# ZJLAB Prometheus Operations

Operate the ZJLAB Prometheus deployment only through its live GitOps owner.
The last verified deployment used ArgoCD Application `zjlab-prometheus` in
namespace `monitoring`; verify the current source and workload before each
operation.

## Scope

- ZJLAB Prometheus owns local Kubernetes metric collection and storage.
- The retired forwarding path sent samples to
  `https://prometheus-write.72602.space/api/v1/write`.
- A request to stop forwarding means remove only the outgoing remote-write
  configuration. Preserve local scraping, local storage, and unrelated
  applications unless separately requested.
- Select `zjlab-ubuntu-local` from ZJLAB or `zjlab-ubuntu-proxy` from 72602
  after checking the execution hostname. These are SSH aliases, not DNS names.

## Routine path

1. Read `content/CSP/Zhejianglab/_index.md` and the ZJLAB operator profile.
2. Verify the live SSH alias, kube context, and node readiness.
3. Inspect the current Application source, rendered Prometheus configuration,
   workload readiness, and local scrape health. Never print Secret data.
4. Change the declared GitOps source only; remove remote-write without
   replacing the deployment or deleting metric storage.
5. Verify ArgoCD convergence, Prometheus readiness, local target health, and
   absence of remote-write configuration or outbound retries.

## Mutation and rollback

Before changing GitOps values, state the current and proposed behavior, blast
radius, and rollback. Roll back through the owning Git source. Do not delete
the Prometheus PVC or runtime Secret as part of disabling remote-write.
