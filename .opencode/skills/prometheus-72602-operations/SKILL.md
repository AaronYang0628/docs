---
name: prometheus-72602-operations
description: Use ONLY when operating Prometheus, kube-state-metrics, or node-exporter in the 72602 cluster, including scraping, rules, storage, and alerts.
---

# Prometheus 72602 Operations

Operate the Prometheus Application in namespace `monitor`. This application
includes the Prometheus server, kube-state-metrics, and node-exporter.

## Fixed scope

- ArgoCD Application: `prometheus`.
- Namespace: `monitor`.
- Grafana consumes Prometheus; do not diagnose a Grafana panel by changing the Prometheus server first.
- Node and cluster health are read-only evidence during routine checks.
- The 72602 Prometheus receives ZJLAB metrics through the write-only
  `prometheus-write.72602.space/api/v1/write` path. ZJLAB writes
  `external_labels.cluster=zjlab`; local 72602 metrics have no `cluster` label.
- The Grafana resource dashboard maps these labels to the `72602` and `zjlab`
  selector values and uses one Prometheus datasource.

## Routine path

1. Read Application health, server/metrics workloads, Services/EndpointSlices, storage, scrape targets, rules, and recent events.
2. Identify the exact target or rule before changing scrape configuration.
3. For GitOps changes, inspect rendered diffs and let ArgoCD own the rollout.
4. Verify server readiness, target health, rule evaluation, storage binding, alert state, and the affected Grafana query.

## Historical reset boundary

On 2026-08-14, after explicit user confirmation, the 30Gi local-path TSDB PVC
for `monitor/prometheus-server` was deleted and recreated. The independent
ZJLAB Prometheus PVC `monitoring/zjlab-prometheus-server` was reset through its
own cluster owner. This was a one-off cleanup of non-business historical data,
with no backup. Prometheus configuration, scrape targets, remote-write
receiver, authentication references, kube-state-metrics, and node-exporter
were retained. Do not repeat the reset for a routine incident; treat it as
irreversible data deletion and obtain fresh confirmation.

## Mutation and rollback

Before changing scrape targets, rules, retention, storage, authentication, or
version, state target, current value, proposed value, blast radius, and
rollback. Use Git for configuration rollback. Do not delete time-series PVCs
or silence alerts as a substitute for fixing the cause; never print tokens.
