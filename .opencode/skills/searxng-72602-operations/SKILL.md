---
name: searxng-72602-operations
description: Use ONLY when operating the internal 72602 SearXNG instance for n8n, including its Helm chart, JSON search API, runtime Secrets, NetworkPolicy, and outbound proxy.
---

# SearXNG 72602 Operations

## Fixed scope

- Argo CD Application: `searxng`.
- Namespace: `searxng`.
- Helm chart: `searxng` from `ghcr.io/littleoffice/charts`, pinned in `manifests/searxng-argocd.yaml`.
- Consumer: n8n main Pods in namespace `n8n`; no public Ingress or HTTPRoute.
- Service: ClusterIP on TCP 8080.
- n8n endpoint: `http://searxng.searxng.svc.cluster.local:8080/`.
- Search-engine egress uses `http://192.168.0.25:17890`; direct Internet egress is denied.
- n8n Assistant search requires JSON format in SearXNG settings. SearXNG alone does not enable the n8n Assistant, which also needs `instance-ai`, a model provider, and a sandbox.

## Routine path

1. Read Application status, Deployment/Pod, Service/EndpointSlice, and the chart-owned NetworkPolicy.
2. Verify `/healthz` and `/search?q=<test>&format=json` from an n8n main Pod; do not expose query data or credentials in logs.
3. Confirm NetworkPolicy allows only the n8n main Pod and limits egress to cluster DNS and the approved proxy.
4. For GitOps changes, edit `manifests/searxng-argocd.yaml`; edit the n8n consumer URL in `manifests/n8n-argocd.yaml`. Inspect the rendered diff and do not patch chart-managed child resources.

## Secrets and rollback

- Runtime Secret `searxng-secret` contains key `secret-key`; settings Secret `searxng-settings` contains key `settings.yml`. Never read or print Secret data.
- Keep the SearXNG signing key out of Git and Helm values. Settings must use upstream defaults, enable JSON output, keep the limiter disabled unless Valkey is deliberately added, and route engine requests through the approved proxy.
- Roll back Git-owned chart and n8n consumer changes together through Git. Argo prunes chart-managed resources; the externally managed runtime Secret is not pruned automatically.
- Do not add an Ingress, NodePort, or public Gateway route for this service.
