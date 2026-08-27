---
name: tempo-72602-operations
description: Use ONLY when operating Tempo in the 72602 cluster, including trace ingestion, querying, storage, retention, and Grafana integration.
---

# Tempo 72602 Operations

Operate the Tempo Application in namespace `monitor`. Tempo is the trace
backend; Grafana owns the visualization and Alloy or application agents own
trace collection.

## Fixed scope

- ArgoCD Application: `tempo`.
- Namespace: `monitor`.
- Load `grafana-72602-operations` for datasource/UI changes and `alloy-72602-operations` for collection changes.

## Routine path

1. Read Application health, Tempo workload/service/endpoints, storage, and recent logs.
2. Classify the issue as receiver, storage, query, retention, or Grafana datasource before changing anything.
3. For GitOps changes, inspect rendered resources and preserve trace data.
4. Verify readiness, trace ingestion/query behavior, storage binding, and the affected Grafana datasource.

## Mutation and rollback

Before changing receivers, retention, storage, authentication, or version,
state target, current value, proposed value, blast radius, and rollback. Use
Git for configuration rollback and an explicit trace-data policy for data
rollback. Never delete trace storage as routine recovery.
