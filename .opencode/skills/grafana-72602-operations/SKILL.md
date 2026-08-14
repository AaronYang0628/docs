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
- The Kubernetes resource dashboard is Git-provisioned from `manifests/grafana-kubernetes-dashboard.yaml`, UID `kubernetes-resources-multicluster`, folder `Kubernetes`.
- It uses the existing Prometheus datasource UID `prometheus`; do not add a second datasource for ZJLAB.
- Prometheus label convention: local 72602 metrics match `cluster=~"^$"`; ZJLAB metrics match `cluster="zjlab"`.

## Routine path

1. Read Application health, Grafana workload/service/endpoints, persistence, and the relevant data-source health.
2. For a dashboard issue, identify whether the fault is Grafana rendering, authentication, or backend query availability.
3. For GitOps changes, edit the declared source and inspect the rendered diff; preserve dashboards and datasource credentials.
4. Verify Grafana readiness, login/access route, dashboard query results, and the affected backend.

For the Kubernetes dashboard, verify the `Cluster` selector returns one node
for 72602, two nodes for ZJLAB, and three for `All`. Node metrics must use the
`kubernetes-service-endpoints` job to avoid counting ZJLAB node-exporter data
twice. Runtime dashboard edits are not the source of truth.

## Mutation and rollback

Before changing authentication, dashboards, data sources, storage, or version,
state target, current value, proposed value, blast radius, and rollback. Use
Git for deployment configuration and an explicit dashboard/data export for
content rollback. Never print admin passwords, API keys, or datasource secrets.
