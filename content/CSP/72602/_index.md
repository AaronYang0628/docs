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
| `grafana.72602.space` | A | `47.110.67.161` | Grafana observability UI |
| `otlp.72602.space` | A | `47.110.67.161` | OTLP ingest endpoint |
| `prometheus-write.72602.space` | A | `47.110.67.161` | Prometheus remote-write endpoint |
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

The manually maintained `72602 K3s` Grafana dashboard (UID
`57b554d9-b60b-414c-ba6f-c6e9e75ed240`) is at version 11. Its custom `cluster`
variable displays `72602`, `zjlab`, and `All`; `72602` maps to the empty-label
matcher (`^$`) so local metrics without an external `cluster` label remain
visible. Node panels aggregate by `(cluster, node)` and deduplicate the
duplicate `kube-state-metrics` and `kubernetes-service-endpoints` scrape jobs.
The obsolete `origin_prometheus` variable was removed, so old URLs that still
pass `var-origin_prometheus` are ignored.

Panel 44/45 use matching `(cluster, node)` aggregations for node memory and
CPU ratios. Panel 75/76 join container metrics with deduplicated
`kube_pod_info` by `(cluster, namespace, pod)` to restore the missing `node`
label before calculating node CPU and memory breakdowns. Verify the dashboard
through Grafana's authenticated datasource query API: `72602`, `zjlab`, and
`All` must return one, two, and three unique nonzero node series respectively;
the Node Information table must return the same number of rows. The dashboard
is stored in Grafana's runtime database, not in a Git-provisioned ConfigMap;
back it up and use Grafana's dashboard API for future updates.

Mail records are managed in the `72602.space` zone with TTL `600`:

| RR | Type | Value | Priority |
|---|---|---|---|
| `mail` | A | `47.110.67.161` | |
| `@` | MX | `mail.72602.space.` | `10` |
| `@` | TXT | `v=spf1 mx ip4:<current-72602-egress-ip> -all` (maintained dynamically) | |
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

DNS for `72602.space` is managed in AliDNS. Active service records should point
to the ECS public address only when the corresponding Ingress and certificate
are Ready; do not describe this zone as dual-managed by Cloudflare.

## Deployed ArgoCD Apps

| App | Namespace | Type | Source | Ingress |
|---|---|---|---|---|
| argocd | argocd | Helm (argo-cd) | argo-cd 9.5.4 | argocd.72602.space |
| cert-manager | basic-components | Helm (Jetstack) | cert-manager 1.20.2 | internal |
| ingress-nginx | basic-components | Helm | ingress-nginx 4.15.1 | shared ingress controller |
| ops-docs | application | manifests (Git) | docs.git/main | ops.docs.72602.space |
| ops-agent | application | manifests (Git) | docs.git/main | ops.agent.72602.space |
| mailu | mailu | Helm (Mailu) | mailu 2.7.3 | mail.72602.space |
| prometheus | monitor | Helm (Prometheus Community) | prometheus 29.18.0 | prometheus-write.72602.space |
| grafana | monitor | Helm (Grafana) | grafana 10.5.15 | grafana.72602.space |
| loki | monitor | Helm (Grafana) | loki 6.55.0 | internal |
| tempo | monitor | Helm (Grafana) | tempo 1.24.4 | otlp.72602.space |
| alloy | monitor | Helm (Grafana) | alloy 1.10.1 | otlp.72602.space |
| homepage | monitor | manifests (Git) | docs.git/main | port.72602.space |
| uptime-kuma | monitor | manifests (Git) | docs.git/main | uptime.72602.space |
| sub2api | application | ArgoCD (Git → OCI Helm) | sub2api 0.1.6 / ghcr.io/wei-shaw/sub2api:0.1.168 | token.72602.space |
| postgresql | database | Helm (Bitnami) | postgresql 18.1.8 | internal |
| redis-shared | storage | Helm (Bitnami) | redis 18.16.0 | internal |
| minio | storage | Helm | minio 16.0.10 | console.minio.72602.space, api.minio.72602.space |
| n8n | n8n | Helm (community) | n8n 1.16.36 | n8n.72602.space, webhook.n8n.72602.space |

`filing-site` is uninstalled. Commit
`0c250db869ae45c6c6a5a850876728783f1b08dd` removed its manifest from the
`ops-docs` source. Detailed filing-site deployment checks are intentionally
omitted from this current-state page; use Git history when an older incident
record is required.

`argocd/ops-docs` reconciles the repository's `manifests` path and owns the
application workloads and their child Applications, including `sub2api` and
`mailu`. The same source also defines the observability Applications listed
above. Sub2API uses the `application` namespace, nginx Ingress, a Ready TLS
certificate, a `10Gi` `local-path` RWO application PVC, and an `8Gi`
`local-path` RWO Redis PVC with AOF enabled.

The `alloy` Application is also live in `monitor` (Grafana Alloy chart
`1.10.1`) and receives OTLP traffic at `otlp.72602.space`; it forwards traces,
metrics, and logs to Tempo, Prometheus, and Loki. Confirm the Application and
its endpoints before changing the observability pipeline.

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

There is no current `ops-agent` manual-deployment exception: it is listed above
as an ArgoCD-managed application. Older notes that called it “Non-ArgoCD” are
historical and should not be used as an ownership rule.

## Network Proxy

For host-level command loading and the standard read-only preflight, use the
[shared Clash/Mihomo runbook](../clashctl/). In particular, `clashctl` is a
shell function and must be sourced explicitly in non-interactive agent shells;
do not probe guessed ports when `clashctl status` and the runtime configuration
provide the answer directly.

### Egress Proxy Architecture

```
k8s Pod (10.42.x.x) --HTTP_PROXY--> 192.168.0.25:17890 (socat) --forward--> 127.0.0.1:7890 (mihomo/clash) --tunnel--> upstream proxies
```

- **mihomo** (clash): listens on `127.0.0.1:7890` (HTTP), `127.0.0.1:7891` (SOCKS5)
  - Config: `/home/aaron/clashctl/resources/runtime.yaml`
  - Key setting: `allow-lan: false` (只监听 localhost)
- **socat bridge**: `0.0.0.0:17890` → `127.0.0.1:7890` (桥接使 k8s Pod 可达)
  - 进程: `socat -d -d TCP-LISTEN:17890,fork,reuseaddr,bind=0.0.0.0 TCP:127.0.0.1:7890`
- **k8s Service**: `argocd-egress-proxy.argocd.svc.cluster.local:17890` → Host `192.168.0.25:17890`; use the Service DNS name rather than a mutable ClusterIP.
- **App proxy env**: 应统一使用 `http://192.168.0.25:17890`（**不是** `192.168.0.25:7890`，因为 mihomo 仅绑定 `127.0.0.1`）

### 关键约束

- mihomo `allow-lan: false` 意味着 **不能** 直接用 `192.168.0.25:7890` 作为代理地址
- 必须通过 socat 桥接 (`192.168.0.25:17890`) 或 `argocd-egress-proxy` Service 访问
- GitHub acceleration: `ghfast.top` URL rewrite + `NO_PROXY` bypass
- Image mirror: `m.daocloud.io/docker.io`, `m.daocloud.io/ghcr.io`

## Known Incident Pattern

- Historical pattern (legacy `.72602.online` hostname): HTTPS handshake fails
  with `tls alert internal error`.
- Root cause: ECS Docker/derper occupies public `443`, traffic never reaches k3s ingress.
- Fix baseline: derper must expose `8443:443`, keep public `443` for ingress NodePort `32443`.

- Symptom: n8n 所有 workflow 报 `connect ECONNREFUSED 192.168.0.25:7890`。
- Root cause: HTTP_PROXY 指向 `192.168.0.25:7890`，但 mihomo 只监听 `127.0.0.1:7890`（`allow-lan: false`）。Pod 无法直连 mihomo 的 LAN IP。
- Fix baseline: HTTP_PROXY/HTTPS_PROXY 必须使用 socat 桥接端口
  `192.168.0.25:17890`（或 Service DNS
  `argocd-egress-proxy.argocd.svc.cluster.local:17890`），该端口由 socat
  转发至 `127.0.0.1:7890`。

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
- 72602 的 SSH 隧道当前由两个独立的用户级 systemd 服务维护，并依赖
  `loginctl enable-linger` 在登出和重启后继续运行；ZJLAB 的对应 loopback
  隧道采用独立的系统级服务，不能把两套服务模型混写。
- ECS must allow inbound TCP `25,465,587,993` from `0.0.0.0/0` and UFW must
  allow the same ports before testing public mail delivery. Preserve the existing
  default firewall policies and unrelated rules.

## Mailu Public Mail Path

- Inbound mail remains `Internet -> ECS 47.110.67.161:25/465/587/993 ->
  HAProxy TCP passthrough with PROXY v2 -> ECS loopback backends
  127.0.0.1:10225/10465/10587/10993 -> independent 10022 reverse tunnel ->
  72602-minipc Mailu front hostPort`.
- ECS public mail ports are owned by HAProxy; the four loopback backends are
  owned by `sshd`. The `10021` SSH service is independent and must not be
  restarted during mail changes.
- The current Mailu source trusts the k3s CNI gateway `10.42.0.1/32` for PROXY
  traffic and exposes PROXY ports `993`, `25`, `465`, and `587`. Read-only
  verification on 2026-08-13 confirmed the Mailu workloads were Ready and the
  `465`/`993` TLS and `587` STARTTLS handshakes completed. The old
  `127.0.0.1/32` trust mismatch and EOF observations are historical incident
  records, not the current baseline.

### Mailu outbound delivery and SPF

- Mailu outbound delivery is direct from Postfix through the 72602 home
  egress. It does not traverse ECS `10022` or ECS HAProxy; those are inbound
  mail paths. The egress address is dynamic, so `update-mailu-spf.timer`
  refreshes the AliDNS SPF record hourly. Query the current record and current
  egress IP during an incident rather than treating an observed historical IP
  as a permanent value.
- The 2026-08-13 audit observed home egress and authoritative/public SPF as
  `36.24.58.213`; the single SPF record is maintained by
  `update-mailu-spf.timer`. Treat that address, and the `36.24.59.216` and
  `125.121.102.50` values in the dated 2026-07-31 delivery record, as dated
  observations rather than permanent allowlist values. A successful SMTP queue
  response still does not prove final inbox placement or reputation.
- Rspamd logged `DKIM_SIGNED` for `72602.space` with selector `dkim`. The
  corresponding DNS record is `2082130099188750336`; DMARC is record
  `2082063800085560320` with `p=none`. PTR lookups for both the dynamic
  egress IP and ECS `47.110.67.161` returned NXDOMAIN. A fixed outbound SMTP
  relay remains the reliable solution; no relay was configured.
- SPF automation still has a one-hour polling interval and cannot guarantee
  delivery immediately after a home IP change. Preserve the timer and inspect
  its last run before making any manual DNS change; do not hard-code a transient
  egress address in this current-state section.

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
- Commit `ddb69f1` on `main` routes both the OpenAI and Grok providers to the
  then-current endpoint `https://sub2api.72602.space/v1`. The current public
  endpoint is `https://token.72602.space/v1`; this dated record is retained as
  history, not as a current endpoint instruction. The Secret was merge-patched
  through stdin to update `api-key` and add `grok-api-key`, preserving its other fields, and
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
  live merged configuration at that time showed both provider base URLs as
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

Older step-by-step operation logs were removed after their durable state,
recovery constraints, and incident lessons were incorporated into the current
sections above and the dedicated runbooks. Use Git history for forensic detail.

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

# Egress proxy 完整性：先读实际端口，再做一次已知 204 检查
CLASH_HOME=/home/aaron/clashctl
. "$CLASH_HOME/scripts/cmd/clashctl.sh"
clashctl status
proxy_port="$("$CLASH_HOME/bin/yq" '."mixed-port" // .port // 7890' \
  "$CLASH_HOME/resources/runtime.yaml")"
curl --proxy "http://127.0.0.1:${proxy_port}" \
  --connect-timeout 5 --max-time 12 --silent --show-error \
  --output /dev/null --write-out 'proxy_http_code=%{http_code}\n' \
  https://www.gstatic.com/generate_204
kubectl exec -n n8n deploy/n8n -- sh -c \
  'test -n "$HTTP_PROXY" && test -n "$HTTPS_PROXY"'

# SSH 隧道
journalctl --user -u reverse-tunnel-ecs-10021.service --since "1 hour ago" --no-pager
journalctl --user -u reverse-tunnel-ecs-10022.service --since "1 hour ago" --no-pager
```
