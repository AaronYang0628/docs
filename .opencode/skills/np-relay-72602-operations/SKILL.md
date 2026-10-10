---
name: np-relay-72602-operations
description: Use ONLY when operating the private NewAPI relay np-relay.service on ecs-99, its /etc/np-relay configuration or keys, or the newapi.zjlab.72602.space authentication path.
---

# NewAPI Relay 72602 Operations

Operate the private NewAPI relay profile on ECS `ecs-99`. It runs the shared
`maas-relay` executable as `np-relay.service`; it is separate from both
`maas-relay.service` and the ZJLAB Kubernetes reverse-tunnel Deployment.

## Fixed Scope

- Unit: `np-relay.service` on `ecs-99`.
- Environment file: `/etc/np-relay.env`.
- Root-only key and state directory: `/etc/np-relay`.
- Local relay listener: `127.0.0.1:18583`.
- Reverse-tunnel upstream: `127.0.0.1:18582` with fixed `/v1` base path.
- Public client route: `https://newapi.zjlab.72602.space/v1`.
- Source and deployment records: `/home/aaron/Ops/ops-private`.

The external client key is `/etc/np-relay/external.key`. Upstream NewAPI
credentials are separate files such as `/etc/np-relay/upstream-01.key`. Clients
must authenticate with the external key using `Authorization: Bearer`; the
relay replaces that header with a selected upstream key. Never substitute one
credential for the other.

## Security Invariant

Never print, read back, hash, fingerprint, length-check, copy, log, or return
any external or upstream key. Never expose Authorization headers, request or
response bodies, or model IDs in command output, logs, documentation, or chat.
Do not pass a key as a command argument or environment value. Read key metadata
only: owner, mode, timestamps, and inode. For authenticated verification, use
a protected in-process check that reads the configured key file and reports
only HTTP status, response shape, and model count.

## Read Path

1. Confirm `hostname`. From `72602-minipc`, validate `ssh -G ecs-99`, then use
   only `ssh ecs-99` for ECS access.
2. Inspect `np-relay.service`, its drop-ins, executable metadata, process start
   time, configured environment variable names, listener, and sanitized
   journal. Never print the environment file's values.
3. Inspect `/etc/np-relay` file metadata only. Do not read any key contents.
4. An unauthenticated `GET /v1/models` returning `401` is expected. For an
   authenticated check, read the external key only inside a protected local
   process and emit status and response shape without bodies or identifiers.
5. Confirm upstream health independently from client authentication. A client
   `401` must not be treated as an upstream key failure.

## Mutation and Verification

Before a mutation, identify ownership in `ops-private`, save unit/config/key
metadata without values, state the target and rollback, and make the smallest
change. Never rotate or recreate a key without explicit authorization and an
approved source. Do not change the NewAPI upstream, ZJLAB tunnel, HAProxy,
ingress, DNS, or public firewall as part of relay-only work.

After a change, verify the unit is active, the listener remains loopback-only,
unauthenticated access returns `401`, and a protected authenticated request
returns the expected status and non-empty model-list shape. Logs and test output
must contain no credentials, headers, bodies, or model IDs.

Rollback restores only the saved relay source/configuration and removes only
new relay state created by the operation. Preserve all key files and unrelated
services.
