+++
title = "72602"
tags = ["k3s", "argocd", "ingress", "tailscale"]
+++

## Scope

This section is the single source of truth for `72602` cluster operations.

## Topology

- Public ECS: `47.110.67.161`
- Domain: `72602.online`
- ArgoCD host: `argocd.72602.online`
- k3s node: `72602-minipc` (`192.168.0.25`)
- Tailscale (minipc): `100.81.60.34`
- Ingress NodePort: `32080` (HTTP), `32443` (HTTPS)
- Ingress class: `nginx`
- Ingress namespace: `basic-components`
- cert-manager issuer: `lets-encrypt`

## Traffic Path

`Internet -> ECS(iptables) -> tailscale -> minipc:k3s ingress-nginx`

## ECS Port Forwarding

- `10022 -> 100.81.60.34:22`
- `80 -> 100.81.60.34:32080`
- `443 -> 100.81.60.34:32443`

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
