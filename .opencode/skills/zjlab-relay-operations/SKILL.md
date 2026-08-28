---
name: zjlab-relay-operations
description: Use ONLY when operating the ZJLAB dev MaaS or NewAPI reverse relay Deployments, SSH Secrets, reverse listeners, or model forwarding paths.
---

# ZJLAB Relay Operations

Operate these two important Deployments in the ZJLAB `dev` namespace through
the local ZJLAB kubeconfig:

| Deployment | SSH Secret | Remote listener | Forward target |
|---|---|---|---|
| `zjlab-maas-reverse-tunnel` | `zjlab-maas-reverse-tunnel-ssh` | `18580` | MaaS upstream over HTTP |
| `zjlab-newapi-reverse-tunnel` | `zjlab-newapi-reverse-tunnel-ssh` | `18582` | NewAPI upstream |

Select `zjlab-ubuntu-local` when connecting from the ZJLAB host; use
`zjlab-ubuntu-proxy` only from `72602-minipc`.

## Read path

1. Confirm `hostname`, kube context, and Ready nodes.
2. Read both Deployments, Pods, Secret metadata, volume modes, container UID,
   init containers, reverse-forward processes, and recent logs.
3. Verify each reverse-forward listener and its configured upstream from the
   Pod/ECS paths without printing Secret data.
4. Check ArgoCD ownership before changing a resource. Prefer the repository
   source; if the workload is unmanaged, record that fact before a live patch.

## Security invariant

Both relays remain non-root and have no service account token, shell, PTY,
agent forwarding, or broad network policy. The existing container identity is
UID/GID `10001`; Secret volumes use `defaultMode=0400` with `fsGroup=10001`, so
the runtime user can read the key without changing host or shared-directory
permissions. Never solve a Secret mount problem by chmod-ing `/home`, `/dev`,
or another shared path, and do not create a host user unless this container
model is proven insufficient. The source Secret is never printed.

## Mutation and verification

Before a live change, save each Deployment manifest and Secret metadata without
Secret data. Apply the smallest change, wait for the new Pod, then verify the
autossh log, the ECS loopback listener, configured upstream connectivity, and
the user-facing model request. Use `Recreate` for a fixed remote listener so
two Pods cannot race for the same port. Readiness must check the actual SSH
child process with `ExitOnForwardFailure=yes`; a `Running` Pod alone is not
healthy. Do not rotate or recreate an SSH key without an approved source.

## Monitoring

Uptime Kuma monitors the public business paths, not the ECS loopback listeners.
Create or maintain these application-owned HTTP(S) monitors in the Uptime Kuma
UI, using the existing notification policy:

| Monitor | URL | Expected status |
|---|---|---|
| `ZJLAB MaaS Relay` | `https://llm.72602.space/` | `404` |
| `ZJLAB NewAPI Relay` | `https://newapi.zjlab.72602.space/v1/models` | `401` |

Use a 60-second interval, a 15-second timeout, and three retries unless the
current Kuma policy says otherwise. The NewAPI check is intentionally
unauthenticated; `401` proves the route, relay, and authentication boundary
responded. Accept only the listed status for each monitor. A `502`, timeout,
TLS error, or any other status is a failure. Do not add credentials or broad
4xx/5xx acceptance, and do not create TCP monitors for the private listeners.

Rollback restores the saved Deployment source or manifest and removes only the
new Pod revision. Never expose the listener, read Secret data, or weaken the
NetworkPolicy.
