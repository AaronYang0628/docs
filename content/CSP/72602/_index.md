+++
title = "72602"
tags = ["k3s", "argocd", "ingress", "ssh-tunnel"]
weight = 1
+++

## Scope

This section is the single source of truth for `72602` cluster operations.

## Topology

- Public ECS: `47.110.67.161` (2C4G, Aliyun Hongkong)
- Domain: `72602.online`
- ArgoCD host: `argocd.72602.online`
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
- `10023` (ZJLAB main SSH, from ZJLAB cluster)
- `10024` (ZJLAB backup SSH, from ZJLAB cluster)
- `80 -> minipc:32080` (HTTP via SSH reverse tunnel on 10022)
- `443 -> minipc:32443` (HTTPS via SSH reverse tunnel on 10022)

## DNS Setup

All subdomains under `72602.online` use A records pointing to `47.110.67.161`:

| Host | Type | Value | Service |
|---|---|---|---|
| `72602.online` | A | `47.110.67.161` | Hugo Docs (root) |
| `argocd` | A | `47.110.67.161` | ArgoCD UI |
| `ops.docs` | A | `47.110.67.161` | Hugo Docs |
| `txt2img.agent` | A | `47.110.67.161` | Open WebUI |
| `sub2api` | A | `47.110.67.161` | AI API proxy |
| `home` | A | `47.110.67.161` | Homepage dashboard |
| `n8n` | A | `47.110.67.161` | N8N workflow |
| `webhook` | A | `47.110.67.161` | N8N webhook receiver |
| `uptime` | A | `47.110.67.161` | Uptime Kuma |
| `langfuse` | A | `47.110.67.161` | Langfuse tracing |
| `clash` | A | `47.110.67.161` | Clash/mihomo panel |
| `api.minio` | A | `47.110.67.161` | MinIO S3 API |
| `console.minio` | A | `47.110.67.161` | MinIO Console |

DNS is managed via Cloudflare / Aliyun DNS (add A record → ECS IP).

## Deployed ArgoCD Apps

| App | Namespace | Type | Source | Ingress |
|---|---|---|---|---|
| argocd | argocd | Helm (arco-cd) | argo-cd 9.5.4 | argocd.72602.online |
| cert-manager | basic-components | Helm (Jetstack) | cert-manager 1.20.2 | internal |
| ingress-nginx | basic-components | Helm | ingress-nginx 4.15.1 | all *.72602.online |
| ops-docs | application | manifests (Git) | docs.git/main | ops.docs.72602.online, 72602.online |
| homepage | monitor | manifests (Git) | docs.git/main | home.72602.online |
| uptime-kuma | monitor | manifests (Git) | docs.git/main | uptime.72602.online |
| open-webui | ai | Helm (open-webui) | open-webui 14.5.0 | txt2img.agent.72602.online |
| sub2api | application | Helm (ghcr) | sub2api 0.1.1 | sub2api.72602.online |
| postgresql | database | Helm (Bitnami) | postgresql 18.1.8 | internal |
| redis-shared | storage | Helm (Bitnami) | redis 18.16.0 | internal |
| minio | storage | Helm | minio 16.0.10 | console.minio, api.minio |
| n8n | n8n | Helm (community) | n8n 1.16.36 | n8n, webhook |
| langfuse | monitor | Helm | langfuse 1.5.29 | langfuse.72602.online |

### Non-ArgoCD (手动部署)

| Deployment | Namespace | Image | Ingress |
|---|---|---|---|
| local-proxy-bridge | argocd | alpine/socat | internal |

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
- **k8s Service**: `local-proxy-bridge.argocd.svc.cluster.local` (ClusterIP: `10.43.19.4:17890`) → Host `192.168.0.25:17890`
- **App proxy env**: 应统一使用 `http://192.168.0.25:17890`（**不是** `192.168.0.25:7890`，因为 mihomo 仅绑定 `127.0.0.1`）

### 关键约束

- mihomo `allow-lan: false` 意味着 **不能** 直接用 `192.168.0.25:7890` 作为代理地址
- 必须通过 socat 桥接 (`192.168.0.25:17890`) 或 k8s Service (`10.43.19.4:17890`) 访问
- GitHub acceleration: `ghfast.top` URL rewrite + `NO_PROXY` bypass
- Image mirror: `m.daocloud.io/docker.io`, `m.daocloud.io/ghcr.io`

## Known Incident Pattern

- Symptom: HTTPS handshake fails for `argocd.72602.online` (`tls alert internal error`).
- Root cause: ECS Docker/derper occupies public `443`, traffic never reaches k3s ingress.
- Fix baseline: derper must expose `8443:443`, keep public `443` for ingress NodePort `32443`.

- Symptom: n8n 所有 workflow 报 `connect ECONNREFUSED 192.168.0.25:7890`。
- Root cause: HTTP_PROXY 指向 `192.168.0.25:7890`，但 mihomo 只监听 `127.0.0.1:7890`（`allow-lan: false`）。Pod 无法直连 mihomo 的 LAN IP。
- Fix baseline: HTTP_PROXY/HTTPS_PROXY 必须使用 socat 桥接端口 `192.168.0.25:17890`（或 k8s Service `10.43.19.4:17890`），该端口由 socat 转发至 `127.0.0.1:7890`。

- Symptom: n8n 社区节点（community nodes）在 Pod 重启后消失，日志报 `Unrecognized node type`。
- Root cause: Helm chart 的 initContainer 使用 `node:20-alpine` 镜像，缺少 Python，安装含 native 依赖的包（如 `isolated-vm`）时 npm install 失败。同时 initContainer args 由 chart 模板生成，每次 ArgoCD sync 覆盖用户手动修改。
- Fix baseline:
  1. initContainer 的 npm install 命令加 `--ignore-scripts` 跳过 native build
  2. ArgoCD `ignoreDifferences` 锁定 initContainer 的 `args` 和 `env`，防止 chart 覆盖
  3. 哈希检查文件存在 emptyDir 自身（非 PVC），确保每次 Pod 重启都触发重新安装

## n8n Community Nodes 运维

### 当前安装的包

| 包名 | 用途 |
|------|------|
| `n8n-nodes-globals` | 全局变量节点 |
| `n8n-nodes-wechat-formatter` | 微信公众号格式化 |
| `n8n-nodes-browserless-api` | Browserless 浏览器自动化 |

包列表定义在 ArgoCD Helm values 的 `nodes.external.packages`。

### 增删社区包

```bash
# 1. 编辑 ArgoCD Application 的 Helm values
kubectl edit app -n argocd n8n
# 找到 nodes.external.packages，添加或删除包名

# 2. 同步 ArgoCD
argocd login --insecure argocd.72602.online --username admin --password $(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d)
argocd app sync n8n --grpc-web

# 3. Pod 重启后 initContainer 自动安装新包列表
```

### 手动紧急修复（跳过 ArgoCD）

当 ArgoCD sync 后社区节点丢失，且不想等 initContainer 完成：

```bash
# 在每个 Pod 内手动安装
kubectl exec -n n8n deploy/n8n -- sh -c \
  "cd /home/node/.n8n/nodes && npm install --ignore-scripts n8n-nodes-globals n8n-nodes-wechat-formatter n8n-nodes-browserless-api"

kubectl exec -n n8n statefulset/n8n-worker -- sh -c \
  "cd /home/node/.n8n/nodes && npm install --ignore-scripts n8n-nodes-globals n8n-nodes-wechat-formatter n8n-nodes-browserless-api"

# 强制 n8n 进程重载社区节点
kubectl delete pods -n n8n -l app.kubernetes.io/component=main
kubectl delete pods -n n8n -l app.kubernetes.io/component=worker
```

### ArgoCD ignoreDifferences 说明

n8n 应用的 ArgoCD `ignoreDifferences` 锁定了以下字段不被 chart 模板覆盖：

| 资源 | 锁定字段 |
|------|---------|
| `Deployment/n8n` | `initContainers[0].args`, `initContainers[0].env` |
| `StatefulSet/n8n-worker` | 同上 |
| `Deployment/n8n-webhook` | `initContainers[1].args`, `initContainers[1].env` |

如需修改 initContainer 参数，直接 `kubectl edit` 对应资源即可，ArgoCD 不会回滚。

## Host-Level Services

| Service | Port | Bind | Description |
|---|---|---|---|
| mihomo (clash) HTTP proxy | `7890` | `127.0.0.1` | Egress proxy, `allow-lan: false` |
| mihomo (clash) SOCKS5 | `7891` | `127.0.0.1` | SOCKS5 proxy |
| mihomo external controller | `9090` | `0.0.0.0` | Clash API/UI, exposed via `clash.72602.online` |
| socat bridge | `17890` | `0.0.0.0` | Forwards to `127.0.0.1:7890`, k8s pod accessible |
| autossh tunnel (main) | `10021`→ECS | - | Reverse tunnel to ECS |
| autossh tunnel (backup) | `10022→ECS` | - | Reverse tunnel + HTTP/HTTPS forwarding |
| k3s ingress HTTP | `32080` | `0.0.0.0` | NodePort for ingress HTTP |
| k3s ingress HTTPS | `32443` | `0.0.0.0` | NodePort for ingress HTTPS |
| ZJLAB SSH main | `10023`→ECS | - | From ZJLAB cluster |
| ZJLAB SSH backup | `10024`→ECS | - | From ZJLAB cluster |

## Notes

- Keep `derper` away from public `443` (use `8443`).
- Keep app ingress aligned with ArgoCD ingress pattern:
  - `ingressClassName: nginx`
  - `cert-manager.io/cluster-issuer: lets-encrypt`
  - TLS secret per host.
- `local-proxy-bridge` 为手动部署（非 ArgoCD 管理），变更需直接 `kubectl apply`。
- mihomo `allow-lan: false` 意味着 **Pod 代理地址必须是 socat 桥接端口 `17890`，不能用 `7890`**。
- SSH 隧道依赖 `loginctl enable-linger` 保持用户级 systemd 服务运行。

## Default Verification Commands

```bash
# 公网入口
curl -vI http://argocd.72602.online
curl -vkI https://argocd.72602.online

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
