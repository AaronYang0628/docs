+++
title = "72602"
tags = ["k3s", "argocd", "ingress", "ssh-tunnel"]
weight = 1
+++

## Scope

This section is the single source of truth for `72602` cluster operations.

## Topology

- Public ECS: `47.110.67.161` (2C4G, `cn-hangzhou`, zone `cn-hangzhou-i`)
- Active ingress domain: `72602.space`; legacy `.72602.online` routes are retired
- ArgoCD host: `argocd.72602.space`
- k3s node: `72602-minipc` (`192.168.0.25`, MiniPC N100 28G+1TB NVMe)
- SSH reverse tunnel: `:10021` (main), `:10022` (backup and Mailu loopback)
- Web tunnel: WireGuard UDP `51820` between ECS and minipc
- Ingress NodePort: `32080` (HTTP), `32443` (HTTPS)
- Ingress class: `nginx`
- Ingress namespace: `basic-components`
- cert-manager issuer: `lets-encrypt`
- Storage class: `local-path` (default, RWO)
- OS: Ubuntu 26.04 LTS (minipc)
- k3s version: v1.34.6+k3s1 (installed via install.sh)

## Traffic Path

Web:

`Internet -> ECS HAProxy TCP passthrough -> WireGuard -> 72602-minipc ingress-nginx NodePort`

Mail:

`Internet -> ECS HAProxy TCP passthrough -> ECS loopback sshd forwards -> 72602-minipc Mailu front`

## ECS Port Forwarding

Web traffic crosses WireGuard; SSH and mail continue to use independent SSH
reverse tunnels. ECS side ports:

- `10021 -> minipc:22` (72602 main SSH)
- `10022 -> minipc:22` (72602 backup SSH and Mailu loopback forwards)
- `80 -> 10.77.0.2:32080` (HAProxy TCP passthrough over WireGuard)
- `443 -> 10.77.0.2:32443` (HAProxy TCP passthrough over WireGuard)
- `127.0.0.1:10225 -> minipc:25` (SMTP via SSH reverse tunnel on 10022)
- `127.0.0.1:10465 -> minipc:465` (SMTPS via SSH reverse tunnel on 10022)
- `127.0.0.1:10587 -> minipc:587` (submission via SSH reverse tunnel on 10022)
- `127.0.0.1:10993 -> minipc:993` (IMAPS via SSH reverse tunnel on 10022)

### ZJLAB NewAPI public route

The isolated ZJLAB NewAPI-compatible service is published at
`https://newapi.zjlab.72602.space`. Its relay, credentials, tunnel, and
rollback procedure are maintained in the private operations repository. The
existing MaaS route at `https://llm.72602.space` remains an independent
service.

ECS HAProxy listens on public IPv4 and IPv6 `25`, `465`, `587`, and `993`, and
on public IPv4 `80` and `443`. Web is plain TCP passthrough without PROXY
protocol or TLS termination. Mail passes TCP with PROXY v2 to the four ECS
loopback backends. TLS remains terminated by ingress-nginx for Web and Mailu
for the implicit-TLS mail protocols.

## DNS Setup

Active service records use `72602.space` and point to `47.110.67.161`:

| Host | Type | Value | Service |
|---|---|---|---|
| `argocd.72602.space` | A | `47.110.67.161` | ArgoCD UI |
| `ops.docs.72602.space` | A | `47.110.67.161` | Hugo Docs |
| `token.72602.space` | A | `47.110.67.161` | AI API proxy |
| `port.72602.space` | A | `47.110.67.161` | Homepage dashboard |
| `n8n.72602.space` | A | `47.110.67.161` | N8N workflow |
| `webhook.n8n.72602.space` | A | `47.110.67.161` | N8N webhook receiver |
| `ops.agent.72602.space` | A | `47.110.67.161` | OpenCode operations agent |
| `uptime.72602.space` | A | `47.110.67.161` | Uptime Kuma |
| `clash.72602.space` | A | `47.110.67.161` | Clash/mihomo panel |
| `api.minio.72602.space` | A | `47.110.67.161` | MinIO S3 API |
| `console.minio.72602.space` | A | `47.110.67.161` | MinIO Console |

### ACME CAA policy

The AliDNS zone `72602.space` is delegated to `dns15.hichina.com` and
`dns16.hichina.com`. AliDNS reports DNSSEC `OFF`; the parent delegation has no
DS record, and both authoritative servers match the delegated nameservers. The
zone has one enabled apex CAA record:

| RecordId | RR | Type | Value | TTL | Status |
|---|---|---|---|---:|---|
| `2084917630338801664` | `@` | `CAA` | `0 issue "letsencrypt.org"` | `600` | `ENABLE` |

This record was created after confirming that no enabled equivalent or
conflicting CAA existed. It is scoped to ACME issuance and did not change any
address, alias, delegation, DNSSEC, or unrelated record. Verify the record with
the AliDNS API, both authoritative servers, and public resolvers `1.1.1.1` and
`8.8.8.8`; each must return `NOERROR` and the exact value. Roll back only this
change with the official AliDNS SDK `DeleteDomainRecord` call for
`2084917630338801664`, then repeat the same resolver checks for an empty CAA
answer. Do not delete other records.

The Clash route is `basic-components/clash-ui-ingress` using class `nginx`,
ClusterIssuer `lets-encrypt`, and Secret `clash.72602.space-tls`. After the
CAA addition, cert-manager retained the failed Order and automatically retried
at its scheduled backoff time. The new Order became `valid` and the Certificate
became Ready. Keep failed Orders and Challenges until normal cert-manager
cleanup; do not repeatedly delete them.

The existing Prometheus receiver also accepts ZJLAB Kubernetes metrics through
a dedicated HTTPS write-only Ingress at `prometheus-write.72602.space`. The
Ingress exposes only the exact `/api/v1/write` path and requires a runtime
Basic Auth Secret; it does not expose Prometheus query, status, or admin APIs.
The TLS certificate is issued by `lets-encrypt`. ZJLAB sends metrics with the
external label `cluster=zjlab`, so the existing Grafana Prometheus datasource
can query ZJLAB without a second Grafana datasource. Credentials remain in
runtime/private secret stores and must not be added to public manifests.

The Git-provisioned Grafana dashboard `Kubernetes Resources` (UID
`kubernetes-resources-multicluster`) is in the `Kubernetes` folder and is
defined by `manifests/grafana-kubernetes-dashboard.yaml`. It uses the existing
Prometheus datasource UID `prometheus`; its `Cluster` selector maps 72602 to
the empty-label matcher (`^$`), ZJLAB to `cluster="zjlab"`, and `All` to both.
Node and namespace selectors are dependent query variables. Node resource
panels use the `kubernetes-service-endpoints` scrape job to avoid counting the
ZJLAB node-exporter series twice. Verification returned one, two, and three
unique nodes for 72602, ZJLAB, and All respectively; Pod CPU, Deployment, and
scrape-target queries were non-empty. The previous runtime dashboard is not
part of the operating path.

On 2026-08-14, the user-authorized reset deleted the 30Gi Prometheus TSDB PVCs
`monitor/prometheus-server` in 72602 and
`monitoring/zjlab-prometheus-server` in ZJLAB. ArgoCD recreated both PVCs and
the existing scrape and remote-write configuration was retained. No backup was
made; all prior metrics history is intentionally unrecoverable. Loki, Tempo,
Grafana users, and Grafana datasource configuration were not cleared.

Mail records are managed in the `72602.space` zone with TTL `600`:

| RR | Type | Value | Priority |
|---|---|---|---|
| `mail` | A | `47.110.67.161` | |
| `@` | MX | `mail.72602.space.` | `10` |
| `@` | TXT | `v=spf1 mx -all` | |
| `_dmarc` | TXT | `v=DMARC1; p=none; rua=mailto:admin@72602.space` | |
| `dkim._domainkey` | TXT | `v=DKIM1; k=rsa; p=<derived-public-key>` | |

The mail records were verified through AliDNS, both authoritative nameservers, and
public resolvers `1.1.1.1` and `8.8.8.8`. Mailu is configured with DKIM selector
`dkim` for `72602.space`, using `/dkim/{domain}.{selector}.key`. The current
admin `/dkim` file is `72602.space.dkim.key`; the front `/dkim` directory is not
used for this admin-owned key.

### Mailu DKIM and PTR readiness

- The domain key was generated idempotently in the admin Pod with the official
  update import path. The input contained only the domain name and
  `dkim_key: -generate-`; `-u -q` was used and the default replace mode was not
  used:

  ```bash
  kubectl -n mailu exec deploy/mailu-admin -- sh -c \
    'printf "%s\\n" "domain:" "  - name: 72602.space" \
      "    dkim_key: -generate-" | flask mailu config-import -u -q -'
  ```

- The admin image does not contain `openssl`. A temporary `mailu-dkim-openssl`
  Pod using the already deployed Mailu front image mounted only the
  `mailu-storage` PVC `dkim` subPath and ran container `openssl` to derive RSA
  public DER base64. It mounted no Secret, was deleted after derivation, and
  emitted no private-key content. The derived public value is intentionally not
  stored in this handbook.
- AliDNS was queried first from `aaron@72602-minipc` with the official SDK
  v4.6.0 in `/home/aaron/.local/venvs/alidns`, sourcing only the mode-`0600`
  `/home/aaron/.aliyun-keys` credential file inside that SDK process. The exact
  `dkim._domainkey` / `TXT` record was absent, so one record was created with
  TTL `600` and value shape `v=DKIM1; k=rsa; p=<derived-public-key>`. Its
  RecordId is `2082130099188750336`.
- The authoritative servers `dns15.hichina.com` and `dns16.hichina.com`, and
  public resolvers `1.1.1.1` and `8.8.8.8`, all returned the complete matching
  TXT value with TTL `600` (410 characters). SPF, DMARC, and MX retained their
  existing values. Mailu admin/front were Ready, all Mailu Pod restart counts
  were zero, and no Warning events were present after the operation.
- Roll back this newly created DNS record only with the official AliDNS SDK
  `DeleteDomainRecord` call for RecordId `2082130099188750336`. Do not delete
  or regenerate the Mailu key during DNS rollback. If a future operation updates
  an existing record instead of creating one, restore that same RecordId's
  pre-change value and TTL rather than deleting it.
- Reverse DNS for `47.110.67.161` currently returns NXDOMAIN. A fresh read-only
  ECS API check found the address as the primary public IP of running instance
  `i-bp1caavgd1twh7wb3n63` in `cn-hangzhou` (zone `cn-hangzhou-i`); its
  `EipAddress.AllocationId` and `EipAddress.IpAddress` are empty. The installed
  official `aliyun-python-sdk-ecs` is `4.24.83`: `DescribeEipAddresses` found
  no EIP allocation for this address in the 32 discovered regions. The
  installed `DescribeNatGateways` model returned zero gateways in 31 regions;
  `sa-east-1` returned `503 ServiceUnavailable` twice and remains unconfirmed.
  The SDK contains `ModifyEipAddressAttributeRequest`, but its request model
  exposes `AllocationId` and `Bandwidth` (plus common owner parameters), not
  `ResourceId`, `RegionId`, or `ReverseDnsName`; it contains no
  `ModifyReverseDns`, `ReverseDnsName`, `DescribeNatGatewayEipAddresses`, or
  `DescribeNatGatewayAttribute` model. `RegionId` is supplied to `AcsClient`,
  not as a PTR parameter in that request. Do not treat
  `ModifyEipAddressAttribute` as a PTR operation or change PTR automatically;
  identify the owning Alibaba product/resource and use its documented console
  reverse-DNS action or Alibaba support path to request `mail.72602.space` if
  that product permits it. This verification made no PTR or DNS change.

Safe checks:

```bash
kubectl -n mailu exec deploy/mailu-admin -- sh -c 'ls -1 /dkim'
kubectl -n mailu exec deploy/mailu-front -- sh -c 'ls -1 /dkim'
dig @dns15.hichina.com dkim._domainkey.72602.space TXT +noall +answer +authority
dig @dns16.hichina.com dkim._domainkey.72602.space TXT +noall +answer +authority
dig -x 47.110.67.161 +noall +answer +authority
```

The AliDNS credential file must be sourced only inside the official SDK process;
never print, log, copy, or commit its values. Never print Mailu Secret data,
passwords, or DKIM private-key contents during these checks.

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
| sub2api | application | ArgoCD (Git → OCI Helm) | sub2api 0.1.6 / ghcr.io/wei-shaw/sub2api:0.1.168 | token.72602.space |
| postgresql | database | Helm (Bitnami) | postgresql 18.1.8 | internal |
| redis-shared | storage | Helm (Bitnami) | redis 18.16.0 | internal |
| minio | storage | Helm | minio 16.0.10 | console.minio.72602.space, api.minio.72602.space |
| n8n | n8n | Helm (community) | n8n 1.16.36 | n8n.72602.space, webhook.n8n.72602.space |

`filing-site` is uninstalled. Commit
`0c250db869ae45c6c6a5a850876728783f1b08dd` removed its manifest from the
`ops-docs` source. The dated 2026-07-28 filing-site entries below are retained
as historical deployment records and do not describe the current state.

`argocd/ops-docs` manages the child `argocd/sub2api` Application from
`https://github.com/AaronYang0628/docs.git`, path `manifests`. Sub2API uses the
`application` namespace, nginx Ingress, a Ready TLS certificate, a `10Gi`
`local-path` RWO application PVC, and an `8Gi` `local-path` RWO Redis PVC with
AOF enabled.

### Ops Docs Publishing

`argocd/ops-docs` compares only the repository's `manifests` path. A commit that
changes only `content` can advance `.status.sync.revision` while remaining
`Synced`; it does not create a sync operation, so the `ops-docs-build` Sync hook
does not run.

Publish a reviewed content commit by setting its full SHA in
`manifests/configmap.yaml` as `PUBLISH_REVISION`, then commit and push that
single manifest change. Automatic sync configures `ops-docs-config` and runs the
hook. The hook fetches and verifies that exact SHA, builds Hugo into
`hugo-docs-pvc`, and writes the SHA to `/usr/share/nginx/html/.ops-docs-revision`.
Its fixed Job name is safe because the delete policy is
`BeforeHookCreation,HookSucceeded`; the successful Job is normally absent after
the operation.

Verify the source, operation, build marker, rollout, and public route:

```bash
git -C /home/aaron/Ops/docs ls-remote origin refs/heads/main

kubectl -n application exec deployment/ops-agent -c ops-agent -- \
  argocd app get ops-docs --hard-refresh --insecure --grpc-web
kubectl -n application exec deployment/ops-agent -c ops-agent -- \
  argocd app history ops-docs --insecure --grpc-web

kubectl -n application rollout status deployment/ops-docs --timeout=300s
kubectl -n application exec deployment/ops-docs -- sh -c \
  'tr -d "\n" < /usr/share/nginx/html/.ops-docs-revision; printf "\n"'
curl -fsS -o /dev/null -w '%{http_code}\n' https://ops.docs.72602.space/
```

The Application revision and published content revision can differ by the
manifest-only trigger commit; both must match their reviewed Git commits. To
roll back the generated site, set `PUBLISH_REVISION` to the previous reviewed
content SHA in Git and push a new trigger commit. Let automatic sync rebuild the
PVC. Do not copy HTML directly or patch the Deployment, ConfigMap, or PVC.

### Non-ArgoCD (手动部署)

| Deployment | Namespace | Image | Ingress |
|---|---|---|---|
| ops-agent | application | ay-dev/ops-agent:0.2.3 | ops.agent.72602.space |

### 2026-08-14: ops-agent 0.2.3 deployed

- Live checks confirmed `hostname=72602-minipc`, kubeconfig context `default`,
  and node `72602-minipc` Ready at `192.168.0.25` on `v1.34.6+k3s1`.
- The live owner is `argocd/ops-agent`, sourced from
  `https://github.com/AaronYang0628/docs.git` at `manifests/ops-agent`, target
  `main`.
- The local `0.2.3` image built successfully with OpenCode `1.18.16` and
  image ID `2e8de824615d5cfc8b3cb887bff21bad974985fe88ad24beda1c9082760c0f7c`.
  The OCI manifest digest was
  `sha256:f1e5e79d570cdec0ce375e264f3c83291912180591f43308d7fe2b66dc326bff`.
  The first attempt hit a transient direct `dl.k8s.io` curl timeout; retrying
  completed the build.
- The image was pushed to the Aliyun personal registry and imported into local
  k3s containerd under tag `0.2.3`. Registry credentials were used through a
  temporary authfile and were not written to Git or the host's persistent
  container configuration.
- The GitOps manifest was committed and pushed to `main`; ArgoCD reconciled the
  updated Deployment. The replacement Pod became Ready with the `0.2.3` image,
  and the rollout completed successfully.
- Authenticated `/global/health` returned healthy, DNS resolved
  `ops.agent.72602.space` to `47.110.67.161`, its `nginx` Ingress and Ready TLS
  remained healthy, and the anonymous public health request returned the
  expected `401`.
- Roll back by restoring the prior `0.2.2` source revision and reconciling; do
  not delete Secrets or PVCs.

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
| autossh tunnel (backup) | `10022→ECS` | - | Reverse SSH + Mailu loopback forwarding |
| WireGuard | `51820/udp` | ECS `0.0.0.0`, minipc dynamic UDP | Encrypted Web path between ECS and minipc |
| ECS HAProxy Web | `80,443` | `0.0.0.0` | TCP passthrough to minipc WireGuard IP |
| ECS HAProxy Mail | `25,465,587,993` | `0.0.0.0` and `[::]` | TCP passthrough with PROXY v2 |
| ECS mail tunnel backends | `10225,10465,10587,10993` | `127.0.0.1` | sshd reverse forwards to minipc Mailu front |
| Mailu front host ports | `25,465,587,993` | minipc hostPort | SMTP, SMTPS, submission, IMAPS |
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
- ECS must allow inbound TCP `25,465,587,993` from `0.0.0.0/0` and UFW must
  allow the same ports before testing public mail delivery. Preserve the existing
  default firewall policies and unrelated rules.

## Mailu Public Mail Path

- The live route is `Internet -> ECS 47.110.67.161:25/465/587/993 -> HAProxy TCP passthrough with PROXY v2 -> ECS 127.0.0.1:10225/10465/10587/10993 -> reverse-tunnel-ecs-10022 -> 72602-minipc Mailu front hostPort`.
- ECS public mail ports are owned by HAProxy and the four loopback backends are
  owned by `sshd`; the
  `reverse-tunnel-ecs-10022.service` is active. The `10021` service is independent
  and must not be restarted during mail changes.
- `ops-docs` is currently synced and healthy at `19e6691`; its child `mailu`
  Application targets Mailu chart `2.7.3` and is synced and healthy.
- Mailu admin, Dovecot, Postfix, front, and the supporting workloads are Ready.
  `mailu-front` and the automatically generated `mailu-front-ext` ClusterIP
  Services both have non-empty endpoints. The current `PORTS` ConfigMap value
  includes `587`.
- The `19e6691` source enables PROXY protocol for `imaps`, `smtp`, `smtps`, and
  `submission`, with `realIpFrom=127.0.0.1/32` and an empty `realIpHeader`.
  Automatic reconciliation recreated `mailu-front`; the Deployment is `1/1`
  Ready with endpoints for all four mail ports. Do not manually restart or
  patch the workload during verification.
- A prior black-box verification was not healthy: `465`/`993` TLS and `587`
  STARTTLS close with EOF, and the non-authenticated probe accepted an external
  `RCPT TO` with `250` before `DATA`; no message data was sent. This does not
  prove delivery, but it fails the required rejection check.
- A prior live Dovecot front config had `haproxy=yes` for these listeners but trusted
  only `127.0.0.1/32`. With Mailu `hostPort` and the k3s CNI path, the front
  sees the transport source as `10.42.0.1` and logs `Client not trusted`. This
  source/trust mismatch was the blocker at that time. Correct it through a reviewed
  Git source change and automatic ArgoCD reconciliation; do not manually apply,
  sync, or restart Mailu.

### Mailu outbound delivery and SPF

- Mailu's outbound path is the Mailu Postfix Pod, the minipc home egress, the
  `reverse-tunnel-ecs-10022` path, and ECS HAProxy. Recent Postfix logs identify
  the actual SMTP source IP as `36.24.59.216`; earlier attempts used
  `125.121.102.50`, confirming dynamic egress churn. The ECS address
  `47.110.67.161` is only the public ingress/tunnel endpoint.
- The authoritative SPF record is the single AliDNS record
  `2082063796864313344` (`@`/`TXT`, TTL `600`):
  `v=spf1 mx ip4:36.24.59.216 -all`. Both `dns15.hichina.com` and
  `dns16.hichina.com`, plus `1.1.1.1` and `8.8.8.8`, returned this value and
  no duplicate SPF TXT was present. `update-mailu-spf.timer` is enabled and
  runs hourly. Its first run at `2026-07-31 13:31:56 CST` failed on the
  state-directory permission, then the retry at `13:32:18` succeeded.
- QQ previously rejected registration-code deliveries at the `DATA` stage
  with `550 SPF check failed` and named `36.24.59.216`. After the existing
  updater corrected SPF, one minimal test to the controlled QQ mailbox at
  `2026-07-31 14:20:38 CST` received `250 OK: queued as`; Postfix recorded
  `dsn=2.0.0 status=sent` and removed the queue item. This verifies the QQ
  SPF gate at that moment, not final inbox placement or reputation.
- Rspamd logged `DKIM_SIGNED` for `72602.space` with selector `dkim`. The
  corresponding DNS record is `2082130099188750336`; DMARC is record
  `2082063800085560320` with `p=none`. PTR lookups for both the dynamic
  egress IP and ECS `47.110.67.161` returned NXDOMAIN. A fixed outbound SMTP
  relay remains the reliable solution; no relay was configured.
- Roll back the updater's SPF change with the official AliDNS SDK by restoring
  record `2082063796864313344` to `v=spf1 mx -all` with TTL `600`. Do not
  delete the DKIM record or regenerate the Mailu key. The one-hour polling
  interval leaves a race after a home IP changes, so SPF auto-update alone
  cannot guarantee QQ delivery.

Useful checks:

```bash
sudo ss -lntp | grep -E ':(25|465|587|993|10022)$'
kubectl -n mailu get deploy,pod,svc,certificate,order -o wide
kubectl -n mailu get endpoints mailu-front -o wide
```

Rollback for this mail proxy change is: `systemctl stop haproxy`; restore the
saved `reverse-tunnel-ecs-10022.service` backup; run
`systemctl --user daemon-reload`; restart only
`reverse-tunnel-ecs-10022.service`. If reverting the required ECS sshd binding
change, restore `/var/backups/sshd_config.20260728T142924Z.before-haproxy`, run
`sshd -t`, reload `sshd`, then restore/restart the 10022 tunnel as needed. Do not
restore an old HAProxy configuration or uninstall the package as part of this
rollback, and do not delete Mailu Secrets or PVCs.

## Recent Operations

### 2026-08-02: `application` namespace prune incident

- **Trigger and time:** commit
  `0c250db869ae45c6c6a5a850876728783f1b08dd` deleted
  `manifests/filing-site.yaml`. The file's first object was the shared
  `Namespace/application`. At `2026-08-02 08:25:53 +08`, the `ops-docs`
  Application's automated prune deleted that Namespace along with the intended
  filing-site resources.
- **Root cause:** the lifecycle of a shared Namespace was coupled to one
  removable workload manifest while automated prune was enabled. Once the
  Namespace disappeared from Git, Argo CD treated it as stale. Kubernetes then
  cascade-deleted namespaced resources; sync options on an individual PVC or
  Secret cannot protect it from deletion through its parent Namespace.
- **Impact:** runtime Secrets and the `application` local-path PVCs were
  deleted, so Ops Agent, Sub2API, and its Redis could not start. Argo CD
  recreated declarative resources, but not runtime Secret values or deleted
  volume contents. PostgreSQL remained intact because it runs in the separate
  `database` namespace.
- **Unrecovered data:** the pre-incident local-path directories for
  `opencode-data`, Sub2API Redis AOF, `sub2api-data`, and filing-site photos were
  deleted and had no snapshot. Those contents were not recovered; replacement
  PVCs do not contain the former data.
- **Secret recovery:** the `2026-08-02 00:00 +08` etcd snapshot was restored
  only into an isolated same-version temporary k3s. The approved whitelist was
  the `aliyun-registry` Secret, five `opencode-*` Secrets, and three
  `sub2api-*` Secrets. All nine were still absent immediately before create-only
  restoration. No Secret value was printed, logged, committed, or allowed to
  overwrite a newer object.
  The production server never ran `cluster-reset`; the procedure is documented
  in [Runtime Secret Recovery](runtime-secret-recovery/).
- **Result:** kubelet recovered the existing post-prune Pods without manual
  deletion or restart. Ops Agent reached `2/2` Ready; Sub2API and its Redis
  reached `1/1`; application health checks passed; and `ops-docs`, `ops-agent`,
  and `sub2api` were `Synced`/`Healthy`. `filing-site-upload-auth`,
  `72602.space-tls`, filing-site, and deleted local-path data were not restored.
- **Immediate guard:** the live `Namespace/application` was merge-patched only
  with `argocd.argoproj.io/sync-options=Prune=false,Delete=false`. This protects
  an Argo CD-tracked Namespace from prune and Application deletion, but it is
  not an admission policy and cannot block direct deletion by another actor.
- **Durable guard:** during the incident response,
  `manifests/application-namespace.yaml` was prepared as a dedicated Namespace
  manifest but was not included in a commit or pushed at that response
  checkpoint; remote `main` and `ops-docs` were still at `0c250db8`. This is a
  historical checkpoint, not a claim about the current repository state.
  Before relying on the guard, verify that the reviewed file is in remote Git,
  Argo CD tracks the Namespace with both sync options, no removable workload
  manifest defines the shared Namespace, and recoverable off-volume backups
  exist for required local-path data. Do not delete or recreate the Namespace
  as rollback.

### 2026-07-30: fix MinIO S3 upload HTTP 413

- Symptom: Sub2API backup uploads to `api.minio.72602.space` failed with S3
  `PutObject` HTTP `413` for an approximately 2.45 MB request. The default
  ingress-nginx `client_max_body_size 1m` rejected the request before MinIO.
- Fix: commit `2338bc6` added this annotation under the MinIO
  `apiIngress.annotations` in Git:

  ```yaml
  nginx.ingress.kubernetes.io/proxy-body-size: "0"
  ```

  This change is scoped only to the MinIO API Ingress; it does not change the
  MinIO console or the shared/global ingress configuration. ArgoCD and MinIO
  became `Synced`/`Healthy`; generated nginx reported `client_max_body_size 0`.
  An authenticated S3 `PutObject`/`Stat`/`Delete` smoke test passed and its
  temporary object was removed. Sub2API backup upload was then manually
  confirmed successful.
- Roll back by reverting `2338bc6` in Git and allowing ArgoCD to reconcile. If
  an emergency live reversal is required first, remove only the annotation
  from `storage/minio-api`, then verify ArgoCD convergence. Do not delete
  MinIO Secrets or PVCs. Do not globally disable request body limits without
  explicit scope and security review.

### 2026-07-29: rotate Ops Agent provider credentials

- Confirmed the operation on `72602-minipc` with context `default`; the only
  node was Ready at `192.168.0.25` on `v1.34.6+k3s1`. Before the change,
  `application/opencode-model` contained only the `api-key` key and the live
  Deployment injected only `OPENAI_API_KEY`. No Secret value was read or
  printed.
- Commit `ddb69f1` on `main` routes both the OpenAI and Grok providers to
  `https://sub2api.72602.space/v1`. The Secret was merge-patched through stdin
  to update `api-key` and add `grok-api-key`, preserving its other fields, and
  `manifests/ops-agent/deployment.yaml` was applied. No credential was written
  to Git or a temporary file, and no `sub2api` or unrelated resource was
  changed.
- The live Deployment now injects `OPENAI_API_KEY` from
  `opencode-model/api-key` and `GROK_API_KEY` from
  `opencode-model/grok-api-key`. Rollout completed with Deployment generation
  and observed generation `16`; Pod `ops-agent-68556dc7f5-6jd84` was `2/2`
  Ready with zero restarts, and the Service endpoint was `10.42.0.207:8080`.
- The authenticated internal `/global/health` check returned `healthy=true`.
  Separate, read-only `/v1/models` requests from the Pod returned HTTP `200`
  with the OpenAI credential and HTTP `200` with the Grok credential. Filtered
  live merged configuration showed both provider base URLs as
  `https://sub2api.72602.space/v1`; new-Pod logs contained no
  `Invalid API key` message.
- DNS for `ops.agent.72602.space` resolved to `47.110.67.161`; Ingress
  `ops-agent` used class `nginx` and that host, and Certificate
  `ops.agent.72602.space-tls` was Ready. The unauthenticated public health URL
  returned the expected HTTP `401`. An Argo CD hard refresh from the Ops Agent
  Pod with `--insecure --grpc-web` reported `ops-agent` Synced to `ddb69f1` and
  Healthy.
- Roll back by restoring the prior approved model credential with the same
  non-output stdin merge-patch method. Remove `grok-api-key` only when reverting
  to the previous single-provider state, and restore/sync source revision
  `a7e434b` for the prior Deployment. Do not delete the Secret, expose its
  values, or modify `sub2api` during rollback.

### 2026-07-28: read-only Mailu verification after c5d1e0a

- Checks ran from the Ops Agent Pod (`hostname=ops-agent-5d6878f6c-xwdb`).
  `kubectl config current-context` was unset, but in-cluster credentials reached
  the only node `72602-minipc`, `Ready` at `192.168.0.25` on `v1.34.6+k3s1`.
- Automatic sync completed at `2026-07-28T12:50:54Z`. Read-only ArgoCD checks
  reported `ops-docs` `Synced`/`Healthy` at full revision
  `c5d1e0adddaace9ad0ba2d3c57c3ef27eb0e6802` (`c5d1e0a`, history ID 24), and
  child Application `mailu` targeting chart `2.7.3` as `Synced`/`Healthy`.
  No manual `apply`, `sync`, `delete`, `rollback`, or restart was run.
- Read-only observations from `12:53:05Z` through approximately `13:00Z` kept
  all eight Mailu Deployments and both StatefulSets at `1/1` Ready. The
  `mailu-front` rollout status completed. `mailu-front` (`10.43.76.102`) and
  `mailu-front-ext` (`10.43.108.81`, ClusterIP) both had endpoint
  `10.42.0.198`. The `mailu-envvars` ConfigMap reported
  `PORTS=80,443,4190,995,993,25,465,587,4190`.
- Certificate `mail.72602.space-tls` was `Ready=True`; its Order was `valid`,
  with validity `2026-07-28T10:22:57Z` through `2026-10-26T10:22:56Z`, and no
  active Challenge. Public DNS returned `mail.72602.space A 47.110.67.161`,
  `72602.space MX 10 mail.72602.space.`, SPF `v=spf1 mx -all`, and DMARC
  `v=DMARC1; p=none; rua=mailto:admin@72602.space`, all with TTL `600`.
  The three PVCs were `Bound` on `local-path` with `RWO`: `2Gi` ClamAV,
  `100Gi` Mailu storage, and `8Gi` Redis.
- Following the HTTPS redirect, `https://mail.72602.space/` returned final
  HTTP `200` at `/sso/login?url=/webmail/?homepage`. Port `25` returned
  `220 mail.72602.space ESMTP ready`; ports `465` and `993` completed verified
  TLS 1.3 handshakes for `mail.72602.space`.
- Port `587` did not provide STARTTLS: `openssl s_client` reported no
  `STARTTLS` and an unexpected EOF. Connections to port `587` on both front
  ClusterIP Services and the postfix ClusterIP were refused, and the front
  container listener list had no `587`. The ConfigMap update was not followed
  by a new front Pod template rollout: the running Pod started at
  `2026-07-28T12:32:36Z`, before the automatic sync, while the Deployment
  remained `1/1` with generation and observed generation `3`. Fix the rollout
  through Git and automatic ArgoCD reconciliation before treating submission
  as ready.
- A single non-authenticated relay probe sent only `EHLO`, `MAIL FROM`,
  `RCPT TO:<nobody@example.net>`, and `QUIT`; it sent no `DATA`, credentials,
  or message. The external RCPT received `250 2.1.5 Ok` instead of a rejection.
  This does not prove actual delivery or an open relay, but it fails the
  required black-box rejection check and requires immediate relay-policy review.
- No Secret data, password, or DKIM private key was read. Remaining manual
  actions are to fix and reverify the front submission rollout, review relay
  policy, obtain the initial admin password through an approved secure process,
  publish the generated DKIM public record, and confirm ECS/UFW/cloud policy
  for outbound TCP 25 before any real delivery test. Do not delete Mailu
  Secrets or PVCs during correction or rollback.

### 2026-07-28: read-only Mailu deployment verification

- Read-only checks ran from the Ops Agent Pod (`hostname=ops-agent-5d6878f6c-xwdb`).
  `kubectl config current-context` was unset, but the in-cluster credentials reached
  the only node `72602-minipc`, which was `Ready` at `192.168.0.25` on
  `v1.34.6+k3s1`.
- Ran `argocd app get ops-docs --hard-refresh --insecure --grpc-web`: revision
  `2773ef5`, `Synced`, `Healthy`. Ran `argocd app get mailu --refresh
  --insecure --grpc-web`: target `2.7.3`, `Synced`, `Degraded`; only the
  `mailu-front` Deployment was `Degraded`.
- Over approximately eight minutes, 17 read-only observations at 30-second
  intervals showed `mailu-admin`, `mailu-dovecot`, `mailu-oletools`,
  `mailu-postfix`, `mailu-rspamd`, `mailu-tika`, and `mailu-webmail` at `1/1`
  Ready, with `mailu-clamav` and `mailu-redis-master` at `1/1`; all three PVCs
  were `Bound` on `local-path` (2Gi, 100Gi, and 8Gi). `mailu-front` remained
  `0/1` Ready with `ProgressDeadlineExceeded`, and `mailu-front` had no
  Endpoints. The old Pod `mailu-front-85d9b6d7d4-6bd9s` used
  `m.daocloud.io/ghcr.io/mailu/nginx:2024.06.57` and remained in
  `ImagePullBackOff` after the mirror returned `403 Forbidden`. The replacement
  Pod `mailu-front-5cbbf9bc99-2qc7v` used the desired
  `ghcr.nju.edu.cn/mailu/nginx:2024.06.57` but remained `Pending` because the
  single node had no free requested host ports. Both ReplicaSets requested
  host ports `110,995,143,993,25,465,587`.
- Ingress `mailu` uses class `nginx` for `mail.72602.space`. Certificate
  `mail.72602.space-tls` is `Ready=True`, its Order is `valid`, and the
  certificate is valid from `2026-07-28T10:22:57Z` through
  `2026-10-26T10:22:56Z`; there is no active Challenge.
- `getent ahostsv4 mail.72602.space` resolved the host to `47.110.67.161`.
  Direct `https://mail.72602.space/` returned `503`. ECS TCP ports `25`,
  `465`, `587`, and `993` accepted connections, but SMTP ports closed before
  returning a banner and SMTPS/IMAPS TLS handshakes were reset. No authentication
  or real mail delivery was attempted.
- The exact blocker is the `mailu-front` image-pull `403 Forbidden` in the old
  ReplicaSet combined with host-port contention during the single-node rolling
  update. DNS, the issued certificate, and public ECS port reachability are not
  the blocker. Webmail/Admin and the mail protocols are therefore not usable yet.
  No delete, rollback, manual `apply`, or ArgoCD `sync` was run, and no Secret
  values were read. A future fix must correct the image/rollout through the Git
  source, then verify the front Endpoints and protocol handshakes; preserve all
  Mailu Secrets and PVCs. Any rollback should restore the reviewed source
  revision through ArgoCD and must not delete Mailu Secrets or PVCs.

### 2026-07-28: diagnose MinIO Console slowness and port TLS fix

- Read-only identity checks from the Ops Agent Pod reported `hostname=ops-agent-5d6878f6c-xwdb`; the kubeconfig context was unset, but in-cluster credentials reached the only node `72602-minipc`, `Ready` at `192.168.0.25` on `v1.34.6+k3s1`. No Secret values, credentials, object names, or object data were read.
- The pending `manifests/ingress-port.yaml` change has ClusterIssuer `lets-encrypt`, `nginx.ingress.kubernetes.io/ssl-redirect: "true"`, and TLS host `port.72602.space`, but no matching `port.72602.space` rule. It belongs to the `application/ops-docs` source, while the live owner is `monitor/homepage` from `manifests/homepage/ingress.yaml`. Therefore it was invalid for the requested route and was not committed, pushed, applied, synced, or rolled back. Before correction, `http://port.72602.space/` returned `200` without redirect; HTTPS returned `200` only with the Kubernetes Ingress Controller fake certificate. The correct future fix must update the owning Homepage ingress source, then sync `ops-docs`, wait for Certificate Ready, and verify strict HTTPS.
- `storage/minio` was `1/1` Ready (`minio-7f776484df-sslgs`), with four restarts 58 days ago, `2m` CPU and `662Mi` memory observed, requests `250m/512Mi`, limits `512m/1Gi`, Service endpoints `10.42.0.21:9000,9001`, and an `8Gi` Bound `local-path` PVC. The mounted filesystem reported `937G` total, `269G` used, and `621G` free. Node MemoryPressure, DiskPressure, and PIDPressure were `False`; node usage was `389m` CPU (`2%`) and `11737Mi` memory (`40%`).
- From 72602, public Console root/API timings were `0.125s`/`0.241s`; from `ecs-99`, `0.772s`/`0.783s`. Direct Service/Pod representative requests were approximately `0.0003`--`0.0006s`; direct ingress was approximately `0.107`--`0.179s`. The 3,259,800-byte main JavaScript asset took `16.802s` locally and `13.893s` from ECS; the 3,835,591-byte login video took `21.337s` and `17.413s`. The 663,820-byte background SVG took `2.144s` and `5.437s`. API responses remained fast.
- Ingress-nginx was at `3m` CPU and `253Mi` memory with five restarts 58 days ago, `16` workers, and `16384` worker connections. In the last 24 hours, 165 Console access requests had no observed 499/502/504 or upstream errors; MinIO logs had no warning/error lines. `/ws/objectManager` returned HTTP `101` and several websocket connections ended at `60.000`--`60.002s`, matching the generated `proxy-read-timeout 60s`; this is a long-lived websocket timeout/reconnect concern, not a slow initial API response.
- Root cause assessment: initial Console slowness is dominated by large static/media transfers through the ECS reverse tunnel and its network variability; MinIO, ingress CPU/concurrency, storage capacity, readiness, and API/backend response time were not limiting. No performance mutation was justified, so no resource, timeout, keepalive, scaling, DNS, or broad configuration change was made. No rollback is needed. A future websocket timeout change must be committed through `manifests/minio-argocd.yaml` and synced through ArgoCD; any port TLS correction must first update the owning Homepage ingress source.

### 2026-07-28: observe automatic sync for d639a46

- Ran the read-only checks from the Ops Agent Pod (`hostname=ops-agent-5d6878f6c-xwdb`). `kubectl config current-context` was unset, but in-cluster credentials reached the only node `72602-minipc`, which was `Ready` at `192.168.0.25` on `v1.34.6+k3s1`. The expected Git manifest route is `mail.72602.space`, with Ingress class `nginx`, issuer `lets-encrypt`, `local-path` storage, Mailu chart `2.7.3`, and `global.security.allowInsecureImages: true`.
- Ran `argocd app get ops-docs --hard-refresh --insecure --grpc-web`. The first observation was `OutOfSync from main (d639a46)` with `Healthy`; automatic sync then completed without a manual sync, and the final state was `Synced to main (d639a46)` and `Healthy`. The output showed child `argocd/mailu` configured. No `argocd app sync`, permission bypass, Kubernetes apply, create, patch, or delete was run.
- Ran `argocd app get mailu --refresh --insecure --grpc-web`. Automatic sync removed the previous `ComparisonError`; Mailu was `Synced to 2.7.3` but `Progressing`. Twenty read-only observations over approximately five minutes (`10:05:17`–`10:10:07` UTC) remained `Synced` / `Progressing` with no ComparisonError condition.
- The required `kubectl -n mailu get deploy,statefulset,pod,pvc,svc,ingress,certificate,order,challenge -o wide` check found all eight Mailu Deployments at `0/1`; `mailu-clamav` StatefulSet at `0/1` and `mailu-redis-master` at `1/1`. The Redis Pod and ACME solver Pod were `Running` and ready; admin, dovecot, and postfix were `ImagePullBackOff`; oletools, rspamd, and webmail were `ErrImagePull`; front, tika, and clamav were `ContainerCreating`. The three PVCs were `Bound` (`2Gi`, `100Gi`, and `8Gi`, all `local-path`/RWO). Ingress `mailu` used `nginx` for `mail.72602.space` at `10.43.13.156` on ports `80,443`. Certificate `mail.72602.space-tls` was not Ready, its Order was `pending`, and its Challenge was `pending`.
- The redacted ACME error was: `Waiting for HTTP-01 challenge propagation: failed to perform self check GET request 'http://mail.72602.space/.well-known/acme-challenge/...': Get "http://mail.72602.space/.well-known/acme-challenge/...": dial tcp: lookup mail.72602.space on 10.43.0.10:53: no such host`. Kubelet also reported, for Mailu components including `admin`, `webmail`, `oletools`, `rspamd`, `postfix`, and `dovecot`: `failed to pull and unpack image "m.daocloud.io/ghcr.io/mailu/<component>:2024.06.57": failed to resolve reference ...: unexpected status from HEAD request to https://m.daocloud.io/v2/ghcr.io/mailu/<component>/manifests/2024.06.57: 403 Forbidden`. The front Pod additionally reported `MountVolume.SetUp failed for volume "certs" : secret "mail.72602.space-tls" not found`. No Secret data was read.
- The Helm comparison blocker was cleared by the committed configuration, and ArgoCD automatically created the Mailu resources. The rollout remained blocked by the image-mirror `403 Forbidden` responses and missing DNS record, which prevented cert-manager HTTP-01 validation and TLS Secret issuance. No resource deletion or rollback was performed. Do not delete the Mailu Secret or PVCs; any Git revert, ArgoCD sync, DNS change, or resource mutation requires explicit authorization and should first correct the image source and DNS.

### 2026-07-28: Mailu deployment blocked before resource sync

- Ran the checks from the Ops Agent Pod (`hostname=ops-agent-5d6878f6c-xwdb`). `kubectl config current-context` was unset, but in-cluster credentials reached `72602-minipc`, which is `Ready` at `192.168.0.25` on `v1.34.6+k3s1`. The existing `mailu` namespace and Secret metadata were left unchanged; Secret values were not read.
- GitHub `main` contains `91986de` with `manifests/mailu-argocd.yaml`. The manifest declares the Mailu route `mail.72602.space`, using the active `72602.space` domain, `nginx`, `lets-encrypt`, and `local-path`.
- Ran `argocd app get ops-docs --hard-refresh --insecure --grpc-web`; `argocd/ops-docs` reported `Synced`, `Healthy`, and revision `91986de`, and its output confirmed that `argocd/mailu` was created. The required `argocd app sync ops-docs --revision main --assumeYes --insecure --grpc-web` then failed before applying changes with `PermissionDenied: applications, sync, default/ops-docs, sub: readonly`.
- No `mailu` sync was attempted, and no Helm install, deletion, or automatic rollback was performed. `argocd app get mailu --insecure --grpc-web` reported `Sync Unknown`, `Health Healthy`, and a `ComparisonError`: Helm rejected the substituted Daocloud Bitnami Redis images because `global.security.allowInsecureImages=true` is not enabled.
- Read-only checks found no Mailu Deployment, Pod, PVC, Service, Ingress, Certificate, CertificateRequest, Order, Challenge, or namespace events. `mail.72602.space` had no DNS result, and the HTTPS probe timed out because no Mailu endpoint was deployed.
- Rollback boundary: stop further sync; after explicit authorization, restore or revert the Git source to the pre-change known-good revision and sync through ArgoCD. Do not delete the `mailu` Secret or any PVC, and do not auto-rollback.
- Next actions: obtain an ArgoCD identity permitted to sync `ops-docs`, review and update the Git manifest with the chart-supported insecure-image setting if the image mirror is retained, then sync `ops-docs` and `mailu` through ArgoCD. Add `mail.72602.space` DNS A record to `47.110.67.161` before validating the public endpoint.

### 2026-07-28: create Mailu namespace and bootstrap Secret

- Ran the checks from the Ops Agent Pod (`hostname=ops-agent-5d6878f6c-xwdb`). `kubectl config current-context` was unset, but the in-cluster Kubernetes credentials reached the live node `72602-minipc`, which is `Ready` at `192.168.0.25` on `v1.34.6+k3s1`.
- The `mailu` namespace did not exist, so `kubectl create namespace mailu` created it. A second check confirmed that `mailu/mailu-secrets` did not exist before creation.
- Generated `secret-key` with `openssl rand -hex 32` and `initial-account-password` with `openssl rand -base64 24` in shell memory, then ran `kubectl create secret generic mailu-secrets -n mailu --from-literal=secret-key="$secret_key" --from-literal=initial-account-password="$initial_account_password"`. No credential value was written to a file, command output, logs, Git, or this documentation.
- Safe verification confirmed namespace `mailu` is `Active`; Secret metadata is `name=mailu-secrets`, `namespace=mailu`, `type=Opaque`, and keys `initial-account-password` and `secret-key`. Secret data values were not read or output.
- No ArgoCD sync was run, and no DNS, security-group, or reverse-tunnel changes were made. Rollback, only with explicit authorization: `kubectl -n mailu delete secret mailu-secrets`. The Secret was not deleted.

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
- Image `ay-dev/ops-agent:0.2.3` uses glibc and contains OpenCode 1.18.16, kubectl 1.34.6, Argo CD CLI 3.3.8, VibeGuard, DCP, and Goal Mode.
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
