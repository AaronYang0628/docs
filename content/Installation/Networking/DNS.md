+++
title = 'DNS Setup'
date = 2026-05-12T15:00:59+08:00
weight = 1
+++

### Overview

For any self-hosted service to be accessible via browser, you need:
1. A domain name (e.g. `72602.online`)
2. DNS A records pointing each subdomain to your public IP
3. (Optional) cert-manager for automatic TLS certificates

### 72602 Cluster DNS

All subdomains use A records → `47.110.67.161` (ECS public IP):

```csv
72602.online                  A  47.110.67.161
argocd.72602.online           A  47.110.67.161
txt2img.agent.72602.online    A  47.110.67.161
ops.docs.72602.online         A  47.110.67.161
sub2api.72602.online          A  47.110.67.161
home.72602.online             A  47.110.67.161
n8n.72602.online              A  47.110.67.161
webhook.n8n.72602.online      A  47.110.67.161
ops.agent.72602.online        A  47.110.67.161
uptime.72602.online           A  47.110.67.161
clash.72602.online            A  47.110.67.161
api.minio.72602.online        A  47.110.67.161
console.minio.72602.online    A  47.110.67.161
```

Add these records in your DNS provider (Cloudflare / Aliyun DNS / etc.).

### Traffic Flow

```
Browser → A record → 47.110.67.161:443
                         ↓ ECS sshd (reverse tunnel from minipc)
                       127.0.0.1:32443 (minipc ingress-nginx NodePort via SSH -R)
                         ↓ ingress-nginx NodePort
                      k3s ingress controller
                         ↓ Ingress rules
                      Service → Pod
```

### TLS Certificates

With ingress-nginx + cert-manager, TLS is automatic:

1. Install cert-manager (see `Installation/Networking/Cert_Manager.md`)
2. Create a ClusterIssuer named `lets-encrypt`
3. Each Ingress gets annotation `cert-manager.io/cluster-issuer: lets-encrypt`
4. cert-manager automatically provisions TLS certificates via HTTP-01 challenge

> ⚠️ For clusters behind NAT/SSH reverse tunnel (like 72602), HTTP-01 validation requires the domain to resolve to the public IP and port 80/443 to reach the cluster. This works because ECS forwards 80/443 → minipc NodePort via SSH reverse tunnel (managed by autossh systemd services).

### Prerequisites

Before deploying any app, ensure:
- [x] Domain registered and DNS manageable
- [x] k3s cluster running
- [x] ingress-nginx installed (NodePort mode)
- [x] cert-manager installed with `lets-encrypt` ClusterIssuer
- [x] ArgoCD installed
- [x] DNS A records added for each target subdomain
