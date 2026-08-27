---
name: alloy-72602-operations
description: Use ONLY when operating Alloy in the 72602 cluster, including log/metric/trace collection and forwarding to observability backends.
---

# Alloy 72602 Operations

Operate Alloy in namespace `monitor`. Alloy is a supporting collector and is
not currently represented by an independent healthy ArgoCD Application in the
service inventory.

## Fixed scope

- Workload location: namespace `monitor`.
- Tracking/ownership must be checked before mutation; a tracking reference to a missing standalone Application is not proof that direct patching is safe.
- Downstream owners: `loki-72602-operations`, `prometheus-72602-operations`, and `tempo-72602-operations`.

## Routine path

1. Read the live workload, ConfigMap/Secret references by name only, endpoints, collector health, and recent logs.
2. Identify the exact pipeline and downstream backend for the failing signal.
3. Find the actual Git/Helm owner before changing configuration; if ownership is unclear, stop after read-only evidence and report the gap.
4. Verify collector readiness, input receipt, export counters/errors, and downstream ingestion.

## Mutation and rollback

Before changing a pipeline, endpoint, credential reference, resource limit, or
version, state target, current value, proposed value, blast radius, and
rollback. Use the discovered owner for rollback; never patch an unowned live
ConfigMap as a shortcut and never print telemetry credentials.
