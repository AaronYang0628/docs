---
name: 72602-service-catalog
description: Use when determining which 72602 service skill owns a request or checking whether a running middleware has operational coverage.
---

# 72602 Service Catalog

This is the coverage index for the live 72602 environment. It is not a
replacement for a service skill and it is not permission to perform live
operations without loading the matching service skill first.

## ArgoCD applications

| Service | Skill | Namespace |
|---|---|---|
| argocd | `argocd-72602-operations` | `argocd` |
| cert-manager | `cert-manager-72602-operations` | `basic-components` |
| grafana | `grafana-72602-operations` | `monitor` |
| homepage | `homepage-72602-operations` | `monitor` |
| ingress-nginx | `ingress-nginx-72602-operations` | `basic-components` |
| loki | `loki-72602-operations` | `monitor` |
| mailu | `mailu-72602-operations` | `mailu` |
| minio | `minio-72602-operations` | `storage` |
| n8n | `n8n-72602-operations` | `n8n` |
| ops-agent | `ops-agent-72602-operations` | `application` |
| ops-docs | `ops-docs-72602-operations` | `application` |
| postgresql | `postgresql-72602-operations` | `database` |
| prometheus | `prometheus-72602-operations` | `monitor` |
| redis-shared | `redis-shared-72602-operations` | `storage` |
| sub2api | `sub2api-72602-operations` | `application` |
| tempo | `tempo-72602-operations` | `monitor` |
| uptime-kuma | `uptime-kuma-72602-operations` | `monitor` |

## Supporting services

| Service | Skill | Location |
|---|---|---|
| alidns-webhook | `alidns-webhook-72602-operations` | cert-manager namespace |
| alloy | `alloy-72602-operations` | monitor namespace |
| mihomo / Clash | `mihomo-72602-operations` | 72602-minipc |
| squid | `squid-72602-operations` | ecs-99 (`47.110.67.161`) |
| socat egress bridge | `socat-72602-operations` | 72602-minipc |
| ECS reverse tunnels | `reverse-tunnel-72602-operations` | 72602-minipc |
| WireGuard Web tunnel | `wireguard-72602-operations` | 72602-minipc and ECS |
| ECS HAProxy | `haproxy-72602-operations` | ECS |
| Mail routing forwards | `mail-routing-72602-operations` | 72602-minipc and ECS |

## Operating rule

For a named service, load exactly its skill before doing service-specific
reads. Routine work follows that skill's fixed read, mutation, verification,
and rollback path. Only a verified live mismatch justifies a one-time drift
investigation; record the corrected fact in the owning skill afterward.

If a running middleware is absent from this catalog, treat that as an
operational gap and create its skill before the next routine change.
