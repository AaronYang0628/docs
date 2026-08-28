+++
title = 'Zhejianglab'
date = 2024-03-07T15:00:59+08:00
weight = 26
+++

{{%children depth="999" description="false" showhidden="true" %}}

## Scope

ZJLAB operational inventory and network details are private. Public pages contain reusable application guidance only; verify dynamic state against the live cluster before applying a runbook.

## Access

```bash
ssh zjlab-ubuntu-local hostname       # when running on ZJLAB
ssh zjlab-ubuntu-local 'kubectl get nodes'
ssh zjlab-ubuntu-proxy hostname       # when running on 72602
```

Use `zjlab-ubuntu-local` for direct access from ZJLAB and
`zjlab-ubuntu-proxy` for the forwarded path from 72602. These are SSH config
aliases, not DNS names: validate configuration with `ssh -G` and reachability
with SSH, not with `getent hosts`. The aliases are provisioned from private
inventory and use an ECS ProxyJump to loopback-only reverse SSH listeners. Do
not publish their resolved endpoints, ports, users, internal topology, or
service names.

Detailed inventory and tunnel recovery procedures are maintained in the private `ops-private` repository with SOPS-encrypted values.

## Tunnel Health

ECS runs an independent check-and-alert-only monitor for the approved
`primary` and `backup` loopback listeners. For each label it requires exactly
one listener, loopback-only binding, sole `sshd` ownership, an independent
owner, a short-timeout SSH banner, and a stable hashed owner signature. Alerts
start only after three consecutive failures.

The monitor stores root-only state and emits labels and fixed reason codes only.
It never restarts or kills a tunnel and never changes sshd, firewall, cloud
network policy, DNS, keys, or endpoints. Real configuration and rollback details
remain in the private SOPS inventory; public pages must not reproduce them.

The ZJLAB tunnel initiators use enabled system-level services so they recover
after a host reboot. User-level legacy tunnel services must remain stopped and
disabled; `Linger=yes` starts the user manager but does not start disabled
services. If both labels fail together, inspect host boot and service-manager
state first, then recover `backup` before `primary`. Verify each alias and its
loopback listener before proceeding to the next label.

For external availability history, report the existing `primary` and `backup`
check results to separate Uptime Kuma Push monitors. Do not expose the relay's
loopback listeners just to make them reachable by Kuma. The Push URLs and the
ECS monitor configuration belong in the private SOPS inventory; see the
[Uptime Kuma setup](/installation/monitor/uptimekuma/#zjlab-tunnel-push-monitors)
for the public setup requirements.

The ECS-side integration is active: ECS listener `10023` reports the `primary`
check and listener `10024` reports the `backup` check. This is separate from
the 72602 public tunnel listeners on `10021` and `10022`, which are not Kuma
Push sources for this monitor.

The stable access map is: `10023` is the ZJLAB primary SSH reverse listener and
`10024` is the backup listener. Both are loopback-only on ECS and are reached
through the ECS ProxyJump path; they are not public endpoints and must not be
added to the ECS security group. The ZJLAB initiators are the system-level
`zjlab-loopback-reverse-primary.service` and
`zjlab-loopback-reverse-backup.service`. User-level services with the same
names are legacy duplicates and must remain stopped and disabled; running both
layers causes listener ownership conflicts and reconnect loops.

When both monitors report `ssh_banner_failed`, first verify the current ZJLAB
egress IPv4 and the ECS security-group allowlist for TCP `22`, then check ECS
sshd and the established SSH child/session. A systemd `active` state alone only
proves that the supervisor is running; it does not prove that the reverse
listener has been established.

The private checker keeps the Push request as a best-effort reporting path.
Healthy checks send `up`; failed checks send `down` with a fixed reason. Push
HTTP failures do not change listener judgment, failure counters, DingTalk
debounce, or tunnel lifecycle. The checker merges existing query parameters
when constructing the request and does not log the Push value.

DingTalk sends one failure notification after three consecutive failures for a
label. The message includes a fixed, redacted recovery action. After a notified
failure becomes healthy, the checker sends one recovery notification; if that
send fails, the alert state is retained and the next healthy check retries it.
Short failures that never cross the alert threshold do not generate a recovery
message.

Deployment verification on 2026-08-13 confirmed the checker dry-run and service
run were healthy for both labels across more than two complete 60-second timer
cycles; recheck live before maintenance.
Rollback restores the root-only ECS backup and encrypted private inventory
backup, then restarts only `zjlab-tunnel-healthcheck.service`; tunnel units are
not restarted as part of monitoring rollback.

## Preflight

For host-level proxy checks, follow the
[shared Clash/Mihomo runbook](../clashctl/) before trying ports or changing
proxy variables. The installed `clashctl` is a shell function, so
non-interactive sessions must source it explicitly.

```bash
# On ZJLAB, use zjlab-ubuntu-local; on 72602, use zjlab-ubuntu-proxy.
ZJLAB_SSH_ALIAS=zjlab-ubuntu-local
ssh "$ZJLAB_SSH_ALIAS" 'kubectl config current-context'
ssh "$ZJLAB_SSH_ALIAS" 'kubectl get nodes'
ssh "$ZJLAB_SSH_ALIAS" 'kubectl get namespace'
ssh "$ZJLAB_SSH_ALIAS" 'kubectl get applications.argoproj.io -A'
ssh "$ZJLAB_SSH_ALIAS" 'kubectl get ingress,certificate -A'
```

## Independent Prometheus Deployment Attempt

An independent Prometheus deployment was prepared for ZJLAB with the public
Prometheus Community `prometheus` chart version `29.18.0`, ArgoCD Application
`zjlab-prometheus`, and destination namespace `monitoring`. Helm rendering and
Kubernetes server-side dry-run succeeded, including the password-file based
remote-write mount and explicit kube-state-metrics and node-exporter scrape
jobs.

The Application reached `Synced` but remained `Healthy: Progressing`. The
30Gi `local-path` PVC stayed `Pending`: the local-path provisioner timed out
while creating its helper Pod and did not bind the volume. Consequently the
Prometheus server, kube-state-metrics, and node-exporter workloads did not
reach the verification gate, so readiness, targets, remote-write delivery,
and the receiving-cluster queries were not claimed as successful.

The attempt was rolled back by deleting only the newly created
`zjlab-prometheus` Application, its `monitoring/zjlab-prometheus-server` PVC,
the runtime remote-write Secret, and the empty `monitoring` namespace. Existing
applications, tunnels, network policies, and metrics-server were not changed.
Before retrying, verify local-path provisioning on the selected node and
repeat the full readiness, target, remote-write, and receiving-cluster query
checks.

### Prometheus Retry (2026-08-05)

The retry used a private node selector for the previously diagnosed healthy
local-path node. The 30Gi PVC bound immediately, and the Prometheus server was
scheduled on the same node. Kube-state-metrics and both node-exporter Pods
reached `Running`.

The Prometheus server then exited with code 2 and entered `CrashLoopBackOff`.
This is a stop condition, so readiness, targets, remote-write queue health,
and receiving-cluster queries were not claimed as successful. The Application,
PVC, runtime Secret, and `monitoring` namespace created for this retry were
rolled back. Existing applications, tunnels, network policies, and
metrics-server were not changed. The next retry must capture the Prometheus
startup error before cleanup and correct the rendered configuration without
publishing credentials.

### Prometheus Deployment (2026-08-05)

The deployment was recreated as ArgoCD Application `zjlab-prometheus` using
Prometheus Community chart `29.18.0`. The rendered server arguments contain the
chart-default `web.enable-lifecycle` flag exactly once; no custom
`server.extraArgs` was configured. The runtime remote-write Secret contains
only the password file and is mounted read-only; credentials are not part of
the Application values.

ArgoCD is `Synced` and `Healthy` at revision `29.18.0`. The 30Gi `local-path`
PVC is `Bound`, the Prometheus server is co-located with that volume on the
private selected node, the Prometheus and kube-state-metrics Deployments are
1/1 Ready, and both node-exporter DaemonSet Pods are Ready with zero restarts.
The server Service and the KSM/node-exporter Services are `ClusterIP`; no
Ingress, NodePort, or admin API was enabled.

Prometheus `/-/ready` returned HTTP 200. The targets API showed the Prometheus,
kube-state-metrics, node-exporter, Kubernetes API server, nodes, cadvisor, and
Kubernetes pod/service discovery jobs up with no scrape errors. The rendered
configuration contains `external_labels.cluster=zjlab`, the remote-write
password-file path, and no password value. Across two complete 30-second
cycles, remote-write samples increased while failed and retried samples stayed
at zero.

The receiving 72602 Prometheus queries were completed after deployment:
`up{cluster="zjlab"}` returned 18 samples,
`kube_node_status_condition{cluster="zjlab"}` returned 54 samples, and
`kube_pod_info{cluster="zjlab"}` returned 72 samples. The newest ZJLAB sample
was approximately five seconds old at verification time, and all three
queries were served by the existing 72602 Prometheus datasource used by
Grafana. No Grafana datasource change was required.

The receiving Prometheus reported zero failed and retried remote-write samples.
After the user-authorized 2026-08-14 metrics reset, the local
`monitoring/zjlab-prometheus-server` TSDB PVC was recreated while this
remote-write configuration remained unchanged. The old local history was not
backed up and is intentionally unrecoverable. The sender queue drained and the
72602 receiver again exposed fresh `cluster="zjlab"` samples; continue watching
the pending queue if its delay grows.

### Prometheus Storage Diagnosis (2026-08-05)

The read-only follow-up found two Ready nodes with no taints and with
`MemoryPressure`, `DiskPressure`, and `PIDPressure` all false. The default
`local-path` StorageClass uses `rancher.io/local-path`, `WaitForFirstConsumer`,
and `Delete` reclaim policy. Its Rancher `v0.0.35` provisioner is `1/1`
Ready. The provisioner configuration has only the default root
`/var/lib/rancher/k3s/storage`; its helper image is BusyBox `1.37.0`, and the
configured setup creates the volume directory and restricts its parent.

Existing Bound `local-path` volumes cover both nodes, and the node filesystem
and inode checks showed substantial headroom. Existing local-path mounts were
also writable from their consuming workloads. This does not support a root
capacity or permission failure as the cause of the Prometheus incident.

The retained helper events use the
`helper-pod-create-pvc-<PVC-UID>` naming pattern. The image was already
available, but helper container creation/startup and retries exceeded the
provisioner's 120-second create-process timeout. Later retries included
`ContainerCreating` and failed log-stream reads before the Prometheus
resources were removed. No helper Pod, PVC, PV, or Prometheus Application is
currently left behind. The evidence points first to helper scheduling/runtime
latency or a local-path/K3s compatibility issue on the selected worker; the
retained evidence does not prove a filesystem fault.

`nfs-data` is currently `1/1` Ready with the v4.0.2 provisioner (Helm chart
4.0.18), an active leader endpoint, `Immediate` binding, `Retain` reclaim
policy, and `archiveOnDelete=true`. Multiple existing `nfs-data` PVCs are
Bound, and the NFS mount is currently read-write with healthy capacity and
inode headroom. It remains a single-backend/single-node dependency, so NFS is
an acceptable fallback for Prometheus only after confirming its latency and
failure policy; it is not automatic high availability.

The minimum reliable retry is to repair and verify helper startup on a
deliberately selected, healthy local-path node, and to make the Prometheus
workload's node selection explicit so the local volume and workload remain
co-located. Rollback is to remove only the new ArgoCD Application and its new
resources; do not remove existing local-path data. NFS is the secondary
option, and ephemeral storage is not recommended for Prometheus. Direct
worker-host journal and host-permission inspection remains a verification gap
because this diagnostic session was restricted to the approved canonical ZJLAB
SSH entry point and did not create a debug Pod.

### Prometheus Storage Follow-up (2026-08-05)

The approved node proxy exposed host `system.journal` and container-log
directories for both nodes. The historical helper had already been removed,
and no matching kubelet, containerd, CRI, mount, image, or sandbox error was
retained for the helper timeout window. The control-plane journal did contain
repeated `PartialObjectMetadata` watch errors, but no evidence connected them
to the local-path helper failure. The Kubernetes node image inventory no
longer advertises the helper image; the historical kubelet event is the
available evidence that it was already cached during the incident.

The strongest retry candidate is the control-plane node that already hosts the
local-path provisioner and several successfully Bound local-path volumes. It
has the standard Linux and control-plane/etcd labels, no taint, and healthy
Ready/pressure conditions. The trade-off is that Prometheus would share the
node with control-plane workloads, and loss of that node makes its local data
unavailable. Use the private value of its `kubernetes.io/hostname` label in
the deployment; do not publish that value.

For a retry, the server values should include the following shape, with
`<selected-local-path-node>` replaced only in the private manifest:

```yaml
server:
  nodeSelector:
    kubernetes.io/hostname: <selected-local-path-node>
  persistentVolume:
    enabled: true
    storageClass: local-path
    accessModes:
      - ReadWriteOnce
    size: 30Gi
```

The retry gate is: the PVC must reach `Bound` and receive node affinity for
the selected node before 120 seconds; the helper must reach container
started/completed without `ContainerCreating`, mount, image, sandbox, or CRI
errors; and the Prometheus server must schedule on the same node and become
Ready. Any repeated runtime error, a helper still in `ContainerCreating` at
60 seconds, or another `ProvisioningFailed` at 120 seconds is a stop
condition. Roll back the new Application and its new resources, then use
`nfs-data` only after accepting its single-backend failure risk. No runtime or
storage change was made during this follow-up.
