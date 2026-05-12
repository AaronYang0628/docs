+++
title = "72602"
tags = ["k3s", "argocd", "ingress", "tailscale"]
+++

## Scope

This section is the single source of truth for `72602` cluster operations.

## Topology

- Public ECS: `47.110.67.161` (2C4G, Aliyun Hongkong)
- Domain: `72602.online`
- ArgoCD host: `argocd.72602.online`
- k3s node: `72602-minipc` (`192.168.0.25`, MiniPC N100 16G+512G)
- Tailscale (minipc): `100.81.60.34`
- Ingress NodePort: `32080` (HTTP), `32443` (HTTPS)
- Ingress class: `nginx`
- Ingress namespace: `basic-components`
- cert-manager issuer: `lets-encrypt`
- Storage class: `local-path` (default, RWO)
- OS: Ubuntu 22.04 / Debian 12 (minipc)
- k3s version: v1.30.x (installed via install.sh)

## Traffic Path

`Internet -> ECS(iptables) -> tailscale -> minipc:k3s ingress-nginx`

## ECS Port Forwarding

- `10022 -> 100.81.60.34:22`
- `80 -> 100.81.60.34:32080`
- `443 -> 100.81.60.34:32443`

## DNS Setup

All subdomains under `72602.online` use A records pointing to `47.110.67.161`:

| Host | Type | Value | Service |
|---|---|---|---|
| `argocd` | A | `47.110.67.161` | ArgoCD UI |
| `ops.agent` | A | `47.110.67.161` | opencode web |
| `txt2img.agent` | A | `47.110.67.161` | Open WebUI |
| `ops.docs` | A | `47.110.67.161` | Hugo Docs |
| `sub2api` | A | `47.110.67.161` | AI API proxy |
| `home` | A | `47.110.67.161` | Homepage dashboard |
| `n8n` | A | `47.110.67.161` | N8N workflow |
| `uptime` | A | `47.110.67.161` | Uptime Kuma |

DNS is managed via Cloudflare / Aliyun DNS (add A record → ECS IP).

## Deployed ArgoCD Apps

| App | Namespace | Type | Ingress |
|---|---|---|---|
| ops-agent | application | manifests | ops.agent.72602.online |
| ops-docs | application | manifests | ops.docs.72602.online |
| open-webui | ai | Helm (open-webui) | txt2img.agent.72602.online |
| sub2api | application | Helm (ghcr) | sub2api.72602.online |
| redis-shared | storage | Helm (Bitnami) | internal |
| homepage | monitor | manifests | home.72602.online |
| uptime-kuma | monitor | manifests | uptime.72602.online |
| n8n | n8n | Helm (community) | n8n.72602.online |
| langfuse | monitor | Helm | langfuse.72602.online |
| postgresql | database | Helm (Bitnami) | internal |
| cert-manager | basic-components | Helm (Jetstack) | internal |
| ingress-nginx | basic-components | Helm | all *.72602.online |

## Network Proxy

- HTTP_PROXY: `http://100.107.240.120:7890` (cluster egress)
- GitHub acceleration: `ghfast.top` URL rewrite + `NO_PROXY` bypass
- Image mirror: `m.daocloud.io/docker.io`, `m.daocloud.io/ghcr.io`

## Known Incident Pattern

- Symptom: HTTPS handshake fails for `argocd.72602.online` (`tls alert internal error`).
- Root cause: ECS Docker/derper occupies public `443`, traffic never reaches k3s ingress.
- Fix baseline: derper must expose `8443:443`, keep public `443` for ingress NodePort `32443`.

## Notes

- Keep `derper` away from public `443` (use `8443`).
- Keep app ingress aligned with ArgoCD ingress pattern:
  - `ingressClassName: nginx`
  - `cert-manager.io/cluster-issuer: lets-encrypt`
  - TLS secret per host.

## Default Verification Commands

```bash
curl -vI http://argocd.72602.online
curl -vkI https://argocd.72602.online
kubectl get ingress -A -o wide
kubectl get svc -A -o wide
kubectl get pods -A -o wide
kubectl get certificate,certificaterequest,order,challenge -A
sudo ss -lntp | grep -E ':80|:443|:8443|:32080|:32443'
sudo iptables -t nat -L PREROUTING -n -v --line-numbers
sudo iptables -t nat -L DOCKER -n -v --line-numbers
```
