---
name: ollama-moderation-gateway-72602-operations
description: Use ONLY when operating the Ollama Moderation Gateway in the 72602 cluster, including its Helm chart, ArgoCD deployment, external runtime Secret, Ingress, TLS certificate, or moderation API.
---

# Ollama Moderation Gateway 72602 Operations

Operate the `ollama-moderation-gateway` workload only in the 72602 cluster.
This service is a stateless OpenAI-compatible moderation gateway backed by
Ollama Cloud. Delegate live Kubernetes work to `72602-k3s-maintainer` and keep
deployment configuration on the GitOps path.

## Fixed scope and ownership

- Argo CD Application: `ollama-moderation-gateway` in namespace `argocd`.
- Workload namespace: `moderation`.
- GitOps manifest: `manifests/ollama-moderation-gateway-argocd.yaml` in the docs repository.
- Application chart: `charts/ollama-moderation-gateway` in `https://github.com/AaronYang0628/ollama-moderation-gateway`.
- Public endpoint: `https://moderation.llm.72602.space`.
- Ingress class: `nginx`; TLS issuer: `lets-encrypt`; TLS Secret: `moderation.llm.72602.space-tls`.
- Service: `ollama-moderation-gateway`, port `8000`.
- Runtime Secret: `moderation/ollama-moderation-gateway`, with `OLLAMA_API_KEYS` and `MODERATION_API_KEYS`.
- The runtime Secret is external to Git. Never put `.moderation.env`, API key values, or rendered Secret data in the repository.
- The workload has no persistent storage and does not run a local Ollama instance.

Treat the chart revision, image digest, ArgoCD revision, Certificate state,
Pod image, and endpoint health as dynamic. Resolve them from the GitOps source
and live resources for every release or incident.

## Read path

1. Confirm execution host and use the canonical `72602-minipc-local` cluster path.
2. Read the ArgoCD Application, Deployment, Pod, Service, EndpointSlice, Ingress, Certificate, and recent events. Read Secret metadata only; never read Secret data.
3. Confirm the Deployment uses the pinned GHCR digest, port `8000`, `/health` liveness, `/readyz` readiness, non-root UID `10001`, and no ServiceAccount token.
4. Test the public `/health` endpoint, TLS certificate, and authenticated `POST /v1/moderations` without exposing the gateway key or request content in logs.
5. For readiness failures, check the Ollama Cloud route through the cluster egress proxy and inspect the exact `/readyz` response before changing the chart.

## Mutation and rollback

Before every cluster mutation, state the exact target, current value, proposed
value, blast radius, and rollback.

- Git owns the ArgoCD Application and chart values. Change the source, inspect the rendered diff, commit only intended files, and let the parent `ops-docs` Application converge it.
- The external runtime Secret is created or rotated outside Git from the local `/home/aaron/Ops/docs/.moderation.env` file. Verify Secret metadata only. A Secret change requires a controlled Deployment restart because environment variables are read at process startup.
- Do not apply the child Deployment, Service, or Ingress directly. Do not create a second Helm release outside ArgoCD.
- Roll back deployment configuration with a new Git revert to the previously verified manifest. Preserve the existing TLS Secret and runtime Secret during ordinary rollback.
- If the image cannot be pulled anonymously, stop before syncing and resolve GHCR visibility or use a separately managed imagePullSecret; do not commit credentials.

## Configuration contract

Non-sensitive defaults are declared in the application chart and GitOps values:

- `APP_ENV=production`
- `OLLAMA_BASE_URL=https://ollama.com`
- `DEFAULT_MODERATION_MODEL=moderation-fast` (`gpt-oss:20b`)
- `POLICY_PATH=configs/policy.yaml`
- `HTTP_PROXY`/`HTTPS_PROXY=http://192.168.0.25:17890`
- `MODERATION_API_KEYS` authenticates clients; callers send `Authorization: Bearer <gateway-key>`.
- `OLLAMA_API_KEYS` is a comma-separated Cloud key pool. `OLLAMA_API_KEY` and `MODERATION_API_KEY` remain supported as legacy single-key inputs.

## Verification

After GitOps convergence:

1. Verify `argocd/ollama-moderation-gateway` is `Synced/Healthy` and the Deployment rollout is complete.
2. Verify the Pod is Ready, has no restart loop, and the EndpointSlice contains the Service endpoint.
3. Verify the Certificate is `Ready` and the HTTPS endpoint presents the host certificate.
4. Run `curl -fsS https://moderation.llm.72602.space/health`.
5. Read a gateway key without echo and run one minimal authenticated `POST /v1/moderations` request with model `moderation-fast`. Require HTTP `200`; never print the key or response containing user content.
6. For Sub2API, use base URL `https://moderation.llm.72602.space` without `/v1` and a timeout of at least `30000` ms.
