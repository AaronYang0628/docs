---
name: maas-relay-72602-operations
description: Use ONLY when operating the custom ECS maas-relay.service, its /etc/maas-relay key files, upstream key rotation, request retry, or health checks.
---

# ECS MaaS Relay Operations

Operate the custom MaaS relay on ECS `ecs-99`. This is separate from the
ZJLAB k3s `zjlab-maas-reverse-tunnel` Deployment: the k3s workload only carries
the SSH reverse tunnel, while this ECS service terminates the public relay
request and selects upstream credentials.

## Fixed scope

- Systemd unit: `maas-relay.service` on `ecs-99`.
- Health timer: `maas-relay-healthcheck.timer` and its service.
- Key directory: `/etc/maas-relay`, owned by root and mode `0700`.
- External bearer file: `/etc/maas-relay/external.key`.
- Upstream key pool: the explicitly configured files plus matching
  `/etc/maas-relay/upstream-*.key` files, up to five total.
- Runtime listener is loopback-only. Public traffic reaches it through the
  documented HAProxy and tunnel path.

Never print, read back, hash, fingerprint, length-check, copy, or log any key,
Authorization header, request body, or response body containing user content.
Report only file metadata, redacted configuration, status codes, and timings.

## Required read path

1. Confirm `hostname`; from `72602-minipc` use canonical SSH alias `ecs-99`
   and validate it with `ssh -G` before connecting.
2. Read the unit, drop-ins, environment variable names, executable metadata,
   process start time, listener, and journal without secret values.
3. Read key file metadata only: owner, mode, mtime, ctime, inode, and whether
   the current process has reloaded after a change. Do not inspect contents.
4. Verify the public contract with bounded probes. The relay health check may
   use its protected local configuration, but commands and output must not
   expose credentials or model/request content.
5. Before a mutation, identify source ownership and save the unit/config
   metadata needed for rollback.

## Configuration and behavior contract

- Key files are runtime inputs, not values embedded in the k3s Pod image.
- File replacement or addition must take effect without a full host restart.
  The service polls credential-file metadata once per minute and also supports
  an application reload signal; do not assume systemd will reload changed
  files automatically.
- The upstream pool must support deterministic candidate selection, skipping
  keys in cooldown, and reloading newly installed files.
- An upstream authentication rejection must cool the selected key for 24
  hours and try the next eligible key. Do not retry the same rejected key in
  the same request.
- Preserve existing quota/balance cooldown behavior and do not classify
  client authentication failures as upstream key failures.
- Persist cooldown state only in a root-owned, non-secret runtime state file
  if process restarts must preserve the 24-hour quarantine. Do not put key
  material or bearer values in state/logs.

## Mutation and verification

Before changing code or the service, state the target, current behavior,
proposed behavior, blast radius, and rollback. Prefer the maintained source
and deployment path. Do not patch an opaque production binary when source or
build ownership cannot be established.

After deployment, verify in order:

1. Service configuration and executable validation pass.
2. `maas-relay.service` reload/restart completes and the listener is healthy.
3. A key-file mtime change is observed by the running process without exposing
   the key.
4. A controlled upstream authentication failure quarantines only the selected
   key for 24 hours and advances to the next key.
5. The public model/catalog health check succeeds and no credentials or user
   content appear in logs.

Rollback restores the saved executable/configuration and removes only the new
   runtime state or unit changes. Do not change HAProxy, WireGuard, ingress,
   the k3s tunnel Deployment, security groups, or unrelated services.
