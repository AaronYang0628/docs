---
name: grafana-72602-operations
description: Use ONLY when operating Grafana in the 72602 cluster, including dashboards, data sources, authentication, persistence, and public access.
---

# Grafana 72602 Operations

Operate the Grafana Application in namespace `monitor`. Grafana is the
visualization layer; Prometheus, Loki, and Tempo own their respective data
services.

## Fixed scope

- ArgoCD Application: `grafana`.
- Namespace: `monitor`.
- Load `prometheus-72602-operations`, `loki-72602-operations`, or `tempo-72602-operations` when changing a data source or its backend.

## Routine path

1. Read Application health, Grafana workload/service/endpoints, persistence, and the relevant data-source health.
2. For a dashboard issue, identify whether the fault is Grafana rendering, authentication, or backend query availability.
3. For GitOps changes, edit the declared source and inspect the rendered diff; preserve dashboards and datasource credentials.
4. Verify Grafana readiness, login/access route, dashboard query results, and the affected backend.

## Mutation and rollback

Before changing authentication, dashboards, data sources, storage, or version,
state target, current value, proposed value, blast radius, and rollback. Use
Git for deployment configuration and an explicit dashboard/data export for
content rollback. Never print admin passwords, API keys, or datasource secrets.
