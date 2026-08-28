+++
title = "UptimeKuma"
+++

### Web Page
[<i class="fa-solid fa-link"></i> uptime-kuma (https://uptime.72602.space)](https://uptime.72602.space)


### Deployment
{{< tabs groupid="uptime-kuma-deployment" title="Depoly For" >}}
{{< tab title="Production" icon="fa-solid fa-rocket" >}}

{{% notice style="transparent" %}}
```bash
kubectl get namespace monitor > /dev/null 2>&1 || kubectl create namespace monitor
kubectl -n monitor apply -f manifests/uptimekuma/
```
{{% /notice %}}

Notes:
- Uptime Kuma is exposed only through k8s ingress (`uptime.72602.space`).
- Do not bind ECS host ports 80/443 for local reverse proxies, they are reserved for forwarding to miniPC ingress.

### ZJLAB Tunnel Push Monitors

ZJLAB's `primary` and `backup` tunnel listeners are loopback-only on the
relay. Uptime Kuma cannot reach them directly from the Kubernetes Pod, so do
not create TCP monitors that target those private listeners. Use one Push
monitor per tunnel instead.

Create these monitors in the Uptime Kuma UI:

| Field | `ZJLAB primary` | `ZJLAB backup` |
| --- | --- | --- |
| Monitor type | `Push` | `Push` |
| Heartbeat interval | Match the ECS check-only monitor interval | Match the ECS check-only monitor interval |
| Monitor timeout | Longer than one normal check interval and its network timeout | Longer than one normal check interval and its network timeout |
| Notifications | Use the existing notification policy | Use the existing notification policy |

Save each monitor and keep its generated Push URL secret. Store the URLs only
in the private SOPS inventory used by the ECS check-only monitor. The monitor
must send `status=up` after a successful tunnel check and `status=down` with a
fixed reason after a failed check. Do not put Push URLs in this repository,
tunnel unit files, public pages, or ordinary logs.

After the Push monitors are created:

1. Pause the old TCP monitors for the private ZJLAB listeners. They cannot
   reach relay loopback addresses from the Kuma Pod and will remain in timeout.
2. Add the two Push URLs to the ECS monitor's secret-backed configuration.
3. Send one controlled heartbeat for each label and confirm both monitors show
   `Up` with a recent heartbeat.
4. Confirm a failed check changes only the matching monitor to `Down`, then
   restore the heartbeat and confirm it returns to `Up`.

The private inventory owns the exact check interval, Push URLs, monitor unit,
and rollback procedure. The public runbook intentionally omits those values.

### ZJLAB Relay HTTP Monitors

The two important ZJLAB `dev` relay Deployments are monitored through their
public business paths. Do not target their ECS loopback listeners from Kuma;
those listeners are intentionally private.

Create these monitors in the Uptime Kuma UI and attach the existing
notification policy:

| Name | Type | URL | Accepted status code |
|---|---|---|---|
| `ZJLAB MaaS Relay` | HTTP(s) | `https://llm.72602.space/` | `404` |
| `ZJLAB NewAPI Relay` | HTTP(s) | `https://newapi.zjlab.72602.space/v1/models` | `401` |

Use a 60-second interval, 15-second timeout, and three retries. The NewAPI
probe is deliberately unauthenticated, so `401` is the expected healthy
response. Accept only the exact status listed for each monitor; `502`, timeout,
TLS failure, or another status must remain a failure.

The completed ECS integration maps listener `10023` to the ZJLAB `primary`
check and listener `10024` to `backup`. These are independent of the 72602
public tunnel listeners `10021` and `10022`. The ECS checker sends `up` after a
healthy check and `down` with a fixed reason after a failed check. Push request
failures are best-effort and do not alter checker judgment, DingTalk debounce,
or tunnel lifecycle. Existing query parameters are preserved without adding a
second `?`.

Verification recorded healthy dry-run and service results for both labels over
more than two complete 60-second cycles. Monitoring rollback restores the
root-only ECS backup and encrypted private inventory backup, then restarts only
the ZJLAB healthcheck service.

{{< /tab >}}
{{< /tabs >}}
