+++
title = "WireGuard Web Tunnel"
tags = ["wireguard", "haproxy", "ingress"]
weight = 2
+++

# WireGuard Web Tunnel

公网 Web 入口固定由 ECS HAProxy 持有，HAProxy 通过 WireGuard 访问
72602-minipc 的 ingress-nginx NodePort。TLS 仍由 ingress-nginx 和
cert-manager 管理；ECS 不复制证书，不启用 PROXY protocol，也不终止 TLS。

```text
Internet TCP 80/443
  -> ECS HAProxy
  -> primary: WireGuard 10.77.0.1 <-> 10.77.0.2 over UDP 51820
  -> backup: SSH loopback 127.0.0.1:18080/18443
  -> minipc TCP 32080/32443
  -> ingress-nginx
```

## Live Configuration

| Item | ECS | 72602-minipc |
|---|---|---|
| WireGuard address | `10.77.0.1/30` | `10.77.0.2/30` |
| Service | `wg-quick@wg0` | `wg-quick@wg0` |
| Config | `/etc/wireguard/wg0.conf` | `/etc/wireguard/wg0.conf` |
| Public UDP | listens on `51820` | initiates to ECS with keepalive |
| Web role | HAProxy `80/443` | ingress NodePort `32080/32443` |
| SSH Web backup | loopback `18080/18443` | independent autossh user service |

Both WireGuard configs and private keys are root-only mode `0600`. Never print,
copy, commit, or place private keys in a ticket. Public keys are identifiers but
do not need to be published in this handbook.

## Firewall

- The Aliyun security group and ECS UFW permit UDP `51820` only from the current
  72602 public IPv4 `/32`.
- `/home/aaron/bin/update-sg-ip.sh` updates UDP `51820` together with TCP
  `22`, `10021`, and `10022` when the home public IP changes.
- minipc UFW allows the WireGuard subnet to reach only TCP `32080` and `32443`.
- Do not expose `32080/32443` through the Aliyun security group.

## Health Checks

Run these checks without displaying key material:

```bash
# Both hosts
systemctl is-active wg-quick@wg0
systemctl is-enabled wg-quick@wg0
sudo wg show wg0

# ECS listener ownership
sudo ss -ltnup | grep -E ':(80|443|51820) '
sudo haproxy -c -f /etc/haproxy/haproxy.cfg

# ECS -> ingress over WireGuard
curl --resolve port.72602.space:32443:10.77.0.2 \
  https://port.72602.space:32443/

# Public strict TLS
curl -fsS -o /dev/null https://port.72602.space/
curl -fsS -o /dev/null https://ops.docs.72602.space/
```

Expected listener ownership on ECS:

- `80/443`: HAProxy
- `51820/udp`: WireGuard kernel interface
- `10021/10022`: sshd reverse listeners

The WireGuard handshake alone is not sufficient. A valid handshake with a
failed NodePort or HAProxy backend still breaks Web traffic, so monitor both the
public HTTPS URL and the direct ECS-to-NodePort path.

ECS runs `/opt/tunnel-monitor/tunnel-healthcheck.sh` every minute. It checks the
HAProxy frontend, WireGuard primary, SSH Web backup, SSH rescue listeners, and
Mail public/loopback ports. DingTalk receives a message only when the state
changes:

- `PRIMARY`: WireGuard serves Web and the SSH backup is ready.
- `BACKUP`: WireGuard failed and HAProxy automatically uses SSH.
- `PRIMARY_BACKUP_FAILED`: Web remains healthy through WireGuard but redundancy
  is unavailable.
- `DOWN`: no usable Web backend remains or the HAProxy frontend failed.
- `_SSH_PORT_FAILURE` / `_MAIL_FAILURE`: the corresponding critical listener
  checks failed.

Notifications include the diagnosed layer, active path, whether automatic
service recovery succeeded, timestamp, and host. They use DingTalk plain-text
messages with real line breaks, not escaped `\n` text.

## Failure Handling

If public Web fails, inspect in this order:

1. HAProxy owns `80/443` and its configuration validates.
2. Both `wg-quick@wg0` services are active and have a recent handshake.
3. ECS can reach `10.77.0.2:32080` and `10.77.0.2:32443`.
4. ingress-nginx Service, Pod, Endpoint, Host routing, and certificate are healthy.
5. The Aliyun security group and ECS UFW still allow UDP `51820` from the current home public IP.

Do not restart `reverse-tunnel-ecs-10021.service` during Web troubleshooting;
it is the independent rescue path from ZJLAB. Do not enable PROXY protocol on
HAProxy unless ingress-nginx is changed in the same reviewed operation.

## Automatic Failover

HAProxy marks WireGuard as the primary backend and the independent SSH loopback
path as `backup`. Checks run every two seconds with `fall 2` and `rise 2`.
Controlled tests measured automatic failover in approximately 8-9 seconds and
automatic return to WireGuard after recovery. Existing connections may fail and
must reconnect; new connections use the healthy path.

The SSH Web backup service is
`reverse-tunnel-ecs-web-backup.service`. It must remain independent from
`10021` (rescue) and `10022` (SSH + Mailu). Never bind its `18080/18443`
listeners publicly; they are ECS loopback-only.

## Emergency Web Rollback

Use this only when WireGuard cannot be restored promptly and the independent
`10021` SSH rescue path has been authenticated first.

1. Keep `10021` authenticated and do not stop Mail HAProxy frontends.
2. Restore the saved HAProxy configuration or the independent SSH Web backup
   service from `ops-private`; validate with `haproxy -c` before reload.
3. If HAProxy itself cannot be restored, only then remove the Web frontends and
   restore the pre-migration `10022` unit containing `-R 80` and `-R 443`.
4. Confirm listener ownership, both SSH rescue entries, Mail loopbacks, and
   strict public TLS.

Do not delete WireGuard keys, uninstall packages, change DNS, or alter
ingress/cert-manager during an emergency Web rollback. The host-local migration
backup is root/private state and must not be copied into Git.
