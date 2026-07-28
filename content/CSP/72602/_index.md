+++
title = "72602"
tags = ["k3s", "argocd", "ingress", "ssh-tunnel"]
weight = 1
+++

## Scope

This section is the single source of truth for `72602` cluster operations.

## Topology

- Public ECS: `47.110.67.161` (2C4G, Aliyun Hongkong)
- Active ingress domain: `72602.space`; legacy `.72602.online` routes are retired
- ArgoCD host: `argocd.72602.space`
- k3s node: `72602-minipc` (`192.168.0.25`, MiniPC N100 28G+1TB NVMe)
- SSH reverse tunnel: `:10021` (main), `:10022` (backup, also carries `80/443`)
- Ingress NodePort: `32080` (HTTP), `32443` (HTTPS)
- Ingress class: `nginx`
- Ingress namespace: `basic-components`
- cert-manager issuer: `lets-encrypt`
- Storage class: `local-path` (default, RWO)
- OS: Ubuntu 26.04 LTS (minipc)
- k3s version: v1.34.6+k3s1 (installed via install.sh)

## Traffic Path

`Internet -> ECS(sshd reverse tunnel) -> minipc:k3s ingress-nginx`

## ECS Port Forwarding

All traffic reaches ECS via SSH reverse tunnel established from minipc. ECS side ports:

- `10021 -> minipc:22` (72602 main SSH)
- `10022 -> minipc:22` (72602 backup SSH, also carries `80`→`32080`, `443`→`32443`)
- `80 -> minipc:32080` (HTTP via SSH reverse tunnel on 10022)
- `443 -> minipc:32443` (HTTPS via SSH reverse tunnel on 10022)

## DNS Setup

Active service records use `72602.space` and point to `47.110.67.161`:

| Host | Type | Value | Service |
|---|---|---|---|
| `argocd.72602.space` | A | `47.110.67.161` | ArgoCD UI |
| `ops.docs.72602.space` | A | `47.110.67.161` | Hugo Docs |
| `sub2api.72602.space` | A | `47.110.67.161` | AI API proxy |
| `port.72602.space` | A | `47.110.67.161` | Homepage dashboard |
| `n8n.72602.space` | A | `47.110.67.161` | N8N workflow |
| `webhook.n8n.72602.space` | A | `47.110.67.161` | N8N webhook receiver |
| `ops.agent.72602.space` | A | `47.110.67.161` | OpenCode operations agent |
| `uptime.72602.space` | A | `47.110.67.161` | Uptime Kuma |
| `clash.72602.space` | A | `47.110.67.161` | Clash/mihomo panel |
| `api.minio.72602.space` | A | `47.110.67.161` | MinIO S3 API |
| `console.minio.72602.space` | A | `47.110.67.161` | MinIO Console |

`txt2img.agent.72602.online` is retired. Its DNS record, certificate, TLS Secret, and unreferenced `ai` data claims have been removed.

DNS is managed via Cloudflare / Aliyun DNS (add A record → ECS IP).

## Deployed ArgoCD Apps

| App | Namespace | Type | Source | Ingress |
|---|---|---|---|---|
| argocd | argocd | Helm (arco-cd) | argo-cd 9.5.4 | argocd.72602.space |
| cert-manager | basic-components | Helm (Jetstack) | cert-manager 1.20.2 | internal |
| ingress-nginx | basic-components | Helm | ingress-nginx 4.15.1 | shared ingress controller |
| ops-docs | application | manifests (Git) | docs.git/main | ops.docs.72602.space |
| homepage | monitor | manifests (Git) | docs.git/main | port.72602.space |
| uptime-kuma | monitor | manifests (Git) | docs.git/main | uptime.72602.space |
| sub2api | application | Helm (ghcr) | sub2api 0.1.1 | sub2api.72602.space |
| postgresql | database | Helm (Bitnami) | postgresql 18.1.8 | internal |
| redis-shared | storage | Helm (Bitnami) | redis 18.16.0 | internal |
| minio | storage | Helm | minio 16.0.10 | console.minio.72602.space, api.minio.72602.space |
| n8n | n8n | Helm (community) | n8n 1.16.36 | n8n.72602.space, webhook.n8n.72602.space |

### Non-ArgoCD (手动部署)

| Deployment | Namespace | Image | Ingress |
|---|---|---|---|
| ops-agent | application | ay-dev/ops-agent:0.2.2 | ops.agent.72602.space |

## Network Proxy

### Egress Proxy Architecture

```
k8s Pod (10.42.x.x) --HTTP_PROXY--> 192.168.0.25:17890 (socat) --forward--> 127.0.0.1:7890 (mihomo/clash) --tunnel--> upstream proxies
```

- **mihomo** (clash): listens on `127.0.0.1:7890` (HTTP), `127.0.0.1:7891` (SOCKS5)
  - Config: `/home/aaron/clashctl/resources/runtime.yaml`
  - Key setting: `allow-lan: false` (只监听 localhost)
- **socat bridge**: `0.0.0.0:17890` → `127.0.0.1:7890` (桥接使 k8s Pod 可达)
  - 进程: `socat -d -d TCP-LISTEN:17890,fork,reuseaddr,bind=0.0.0.0 TCP:127.0.0.1:7890`
- **k8s Service**: `argocd-egress-proxy.argocd.svc.cluster.local` (ClusterIP: `10.43.42.223:17890`) → Host `192.168.0.25:17890`
- **App proxy env**: 应统一使用 `http://192.168.0.25:17890`（**不是** `192.168.0.25:7890`，因为 mihomo 仅绑定 `127.0.0.1`）

### 关键约束

- mihomo `allow-lan: false` 意味着 **不能** 直接用 `192.168.0.25:7890` 作为代理地址
- 必须通过 socat 桥接 (`192.168.0.25:17890`) 或 `argocd-egress-proxy` Service 访问
- GitHub acceleration: `ghfast.top` URL rewrite + `NO_PROXY` bypass
- Image mirror: `m.daocloud.io/docker.io`, `m.daocloud.io/ghcr.io`

## Known Incident Pattern

- Symptom: HTTPS handshake fails for `argocd.72602.online` (`tls alert internal error`).
- Root cause: ECS Docker/derper occupies public `443`, traffic never reaches k3s ingress.
- Fix baseline: derper must expose `8443:443`, keep public `443` for ingress NodePort `32443`.

- Symptom: n8n 所有 workflow 报 `connect ECONNREFUSED 192.168.0.25:7890`。
- Root cause: HTTP_PROXY 指向 `192.168.0.25:7890`，但 mihomo 只监听 `127.0.0.1:7890`（`allow-lan: false`）。Pod 无法直连 mihomo 的 LAN IP。
- Fix baseline: HTTP_PROXY/HTTPS_PROXY 必须使用 socat 桥接端口 `192.168.0.25:17890`（或 k8s Service `10.43.19.4:17890`），该端口由 socat 转发至 `127.0.0.1:7890`。

## Host-Level Services

| Service | Port | Bind | Description |
|---|---|---|---|
| mihomo (clash) HTTP proxy | `7890` | `127.0.0.1` | Egress proxy, `allow-lan: false` |
| mihomo (clash) SOCKS5 | `7891` | `127.0.0.1` | SOCKS5 proxy |
| mihomo external controller | `9090` | `0.0.0.0` | Clash API/UI, exposed via `clash.72602.space` |
| socat bridge | `17890` | `0.0.0.0` | Forwards to `127.0.0.1:7890`, k8s pod accessible |
| autossh tunnel (main) | `10021`→ECS | - | Reverse tunnel to ECS |
| autossh tunnel (backup) | `10022→ECS` | - | Reverse tunnel + HTTP/HTTPS forwarding |
| k3s ingress HTTP | `32080` | `0.0.0.0` | NodePort for ingress HTTP |
| k3s ingress HTTPS | `32443` | `0.0.0.0` | NodePort for ingress HTTPS |

## Notes

- Keep `derper` away from public `443` (use `8443`).
- Keep app ingress aligned with ArgoCD ingress pattern:
  - `ingressClassName: nginx`
  - `cert-manager.io/cluster-issuer: lets-encrypt`
  - TLS secret per host.
- `argocd-egress-proxy` 由 `ops-docs` ArgoCD Application 管理，并为 repo-server 提供 Git/Helm 出站代理。
- mihomo `allow-lan: false` 意味着 **Pod 代理地址必须是 socat 桥接端口 `17890`，不能用 `7890`**。
- SSH 隧道依赖 `loginctl enable-linger` 保持用户级 systemd 服务运行。

## Recent Operations

### 2026-07-28: black-box verification of filing-site upload policy

- Ran the checks with `curl` on `72602-minipc` (`hostname=72602-minipc`, context `default`). The live route is `https://72602.space/`; `GET http://72602.space/` returned `308` with `Location: https://72602.space`, and the HTTPS home returned `200 text/html` (19,881 bytes) containing `data-upload="aaron"`, `data-upload="licorice"`, and `data-upload="yakult"`.
- Anonymous `GET https://72602.space/photos/{aaron,licorice,yakult}/` each returned `200 application/json` with `[]`; the corresponding `HEAD` requests each returned `200 application/json`.
- The one temporary test object was `https://72602.space/photos/aaron/verification-1785228022571821377.png`, a valid 1x1 PNG of 68 bytes. Anonymous `PUT` and wrong-credential `PUT` each returned `401 text/html`; `PUT` with the temporary `uploader` credential held in shell memory since Secret creation returned `201`. The follow-up Aaron listing returned `200 application/json` and showed the file as `type=file`, `size=68`; the image GET returned `200 image/png` with 68 bytes.
- Authenticated `DELETE` on the temporary object and authenticated `MKCOL`, `MOVE`, `COPY`, and `POST` on the Aaron directory were all rejected with `403 text/html`; no authenticated DELETE succeeded. Cleanup used `kubectl -n application exec filing-site-55cff975bf-z67xw -- rm -f -- /data/files/aaron/verification-1785228022571821377.png`. The post-cleanup Aaron listing returned `200 application/json` with `[]`, and the exact path was absent in the Pod.
- Live resource checks passed: Deployment `filing-site` is `1/1` available, Pod `filing-site-55cff975bf-z67xw` is Running and ready with zero restarts, Ingress `filing-site` uses class `nginx` for `72602.space`, and `72602.space-tls` is Ready. PVC `filing-site-photos` is `Bound` to a `5Gi` `local-path` PV.
- In the nginx container (`uid=101`, `gid=101`), `/data/files/aaron`, `/data/files/licorice`, and `/data/files/yakult` exist and are writable with mode `775`; `/data/.tmp` exists and is writable with mode `770`. No Kubernetes Secret value was read, no manifest was changed, no ArgoCD sync was run, and no test object was retained. Recheck with the same curl method matrix and `kubectl exec` path test; rollback is limited to deleting the exact temporary path if a test object remains. Do not delete the PVC or Secret.

### 2026-07-28: sync filing-site photo albums from ops-docs

- Confirmed `72602-minipc`, context `default`, node `72602-minipc` Ready at `192.168.0.25` (`v1.34.6+k3s1`); live route is `https://72602.space/` through the `nginx` ingress class.
- Hard-refreshed `argocd/ops-docs` with `argocd app get ops-docs --hard-refresh --insecure --grpc-web` (the installed CLI is v3.3.8 and does not support `argocd app refresh --hard`), then ran `argocd app sync ops-docs --revision main --assumeYes --insecure --grpc-web`.
- The requested baseline was `98dbe94`, but `origin/main` advanced during the operation to `07f0e515feb7379ca79516a6c31f0e41be5a04b4` (`fix: increase sub2api ingress body timeout`); the final sync used that remote `main` revision. ArgoCD finished `Succeeded`, `Synced`, and `Healthy` from `16:30:08` to `16:30:47` (+0800), with message `successfully synced (no more tasks)`.
- `ops-docs-build` briefly remained in `Init:0/1` while `clone-repo` fetched the repository. Both `clone-repo` and `hugo` exited `0`; the hook Job reached the expected succeeded pods. No manifest fix was necessary.
- `application/filing-site` rollout completed. Pod `filing-site-55cff975bf-z67xw` is `1/1 Running`; `init-albums` completed with exit `0`, and `nginx` is ready with zero restarts. Deployment conditions `Available=True` and `Progressing=True` are present.
- PVC `filing-site-photos` is `Bound` to a `5Gi` `local-path` PV. Ingress annotations remain issuer `lets-encrypt`, SSL redirect enabled, body size `25m`, request buffering off, and read/send timeouts `120`; TLS Secret is `72602.space-tls`.
- Read-only verification: `nginx -t` reported syntax ok and test successful inside the Pod; HTTPS GET `https://72602.space/` returned HTTP `200` with `text/html` from `47.110.67.161`. Recent events show successful local-path provisioning, old ReplicaSet scale-down/new ReplicaSet scale-up, and Ingress scheduled for sync.
- No Kubernetes Secret value was read, and no PUT/upload request or resource deletion was performed. Rollback requires explicit authorization and review of the current `main`: syncing the captured pre-sync revision `98dbe94` would also roll back later commits such as `07f0e51`; do not delete the PVC or Secret.

### 2026-07-28: create filing-site upload authentication Secret

- Confirmed `72602-minipc` as the active node and found no existing `application/filing-site-upload-auth` Secret.
- Generated the `uploader` password in shell memory with `openssl rand -hex 18`, generated an nginx-compatible apr1 hash with `openssl passwd -apr1`, and applied `application/filing-site-upload-auth` with key `htpasswd`. No credential material was written to disk or Git.
- `manifests/filing-site.yaml` references this Secret for the `filing-site` Deployment, but does not define the Secret; no ArgoCD sync was required.
- Safe verification confirmed metadata `name=filing-site-upload-auth`, `namespace=application`, `type=Opaque`, and key `htpasswd` without reading its value. The Deployment rollout succeeded with its Pod `1/1 Running`.
- Ingress remains `nginx` at `https://72602.space/`; certificate `72602.space-tls` is Ready under `lets-encrypt`, and the public HTTPS check returned HTTP `200`.
- Rollback, only with explicit authorization: `kubectl -n application delete secret filing-site-upload-auth`.

### 2026-07-16: reset `csst` and update N8N webhook host

- Deleted and recreated the `csst` namespace. Only the namespace default ServiceAccount and `kube-root-ca.crt` ConfigMap remain.
- Changed N8N `WEBHOOK_URL`, webhook worker URL, Ingress rule, and TLS DNS name from `webhook.72602.online` to `webhook.n8n.72602.online`.
- Synced ArgoCD application `argocd/n8n`; main, webhook, MCP webhook, and worker rollouts completed.
- cert-manager completed HTTP-01 validation and issued the updated certificate.

### 2026-07-16: migrate OpenCode web to k3s

- Replaced the host systemd process and static EndpointSlice with the `application/ops-agent` workload.
- The Pod mounts `/home/aaron/Ops/docs` at `/workspace`, loads the project `.opencode/opencode.json`, and persists sessions in the `opencode-data` PVC.
- Image `ay-dev/ops-agent:0.2.2` uses glibc and contains OpenCode 1.18.2, kubectl 1.34.6, Argo CD CLI 3.3.8, VibeGuard, DCP, and Goal Mode.
- OpenCode native Basic Auth protects both Ingress and cluster-internal access. Anonymous HTTPS returns `401`; authenticated HTTPS returns `200`.
- An Nginx sidecar publishes the `Ops Agent` browser title and proxies Terminal WebSocket and event streams.

### 2026-07-16: remove Langfuse and refresh Homepage

- Permanently removed the seven unused Langfuse PVCs (56 GiB) and six residual Secrets from `monitor`.
- Removed Langfuse and pgAdmin from Homepage and added the OpenCode operations agent.
- Restored the ArgoCD Homepage widget by binding the `readonly` API account to `role:readonly`.

### 2026-07-17: align Ops resource names

- Renamed the Hugo workload and its Service, ConfigMap, build Job, and Ingress resources to `ops-docs`; retained `hugo-docs-pvc` to preserve generated content.
- Renamed the OpenCode-based workload, Service, Ingress, proxy ConfigMap, manifest directory, and Dockerfile to `ops-agent`; retained existing `opencode-*` PVC and Secrets to preserve sessions and credentials.
- Replaced the manual `local-proxy-bridge` with the GitOps-managed `argocd-egress-proxy`; ArgoCD repo-server uses its cluster Service while applications can continue using host port `17890`.

## Default Verification Commands

```bash
# 公网入口
curl -vI http://argocd.72602.space
curl -vkI https://argocd.72602.space

# k8s 资源
kubectl get ingress -A -o wide
kubectl get svc -A -o wide
kubectl get pods -A -o wide
kubectl get certificate,certificaterequest,order,challenge -A

# 主机端口
sudo ss -lntp | grep -E ':80|:443|:8443|:32080|:32443|:7890|:17890|:9090'

# ECS 转发
sudo iptables -t nat -L PREROUTING -n -v --line-numbers
sudo iptables -t nat -L DOCKER -n -v --line-numbers

# Egress proxy 完整性
curl -s --connect-timeout 3 -x http://127.0.0.1:17890 http://httpbin.org/ip
kubectl exec -n n8n deploy/n8n -- env | grep -E 'HTTP_PROXY|HTTPS_PROXY'

# SSH 隧道
journalctl --user -u reverse-tunnel-ecs-10021.service --since "1 hour ago" --no-pager
journalctl --user -u reverse-tunnel-ecs-10022.service --since "1 hour ago" --no-pager
```
