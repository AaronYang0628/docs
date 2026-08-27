---
name: loki-72602-operations
description: Use ONLY when operating Loki or its gateway in the 72602 cluster, including log ingestion, querying, retention, storage, and Grafana integration.
---

# Loki 72602 Operations

Operate the Loki Application in namespace `monitor`. Loki and its gateway are
the log backend; Alloy is the collection path and Grafana is the query UI.

## Fixed scope

- ArgoCD Application: `loki`.
- Namespace: `monitor`.
- Load `alloy-72602-operations` for collection/forwarding issues and `grafana-72602-operations` for dashboard/query UI issues.

## Routine path

1. Read Application health, Loki/gateway workloads, services/endpoints, storage, and recent logs.
2. Classify the issue as collection, gateway, query, retention, or storage before changing configuration.
3. For GitOps changes, inspect rendered resources and preserve existing log data.
4. Verify component readiness, ingestion from the affected source, query response, gateway route, and storage binding.

## Mutation and rollback

Before changing retention, storage, authentication, ingestion, or version,
state target, current value, proposed value, blast radius, and rollback. Use
Git for configuration rollback and an explicit log-storage policy for data
rollback. Never delete log PVCs as routine recovery and never expose tokens.
