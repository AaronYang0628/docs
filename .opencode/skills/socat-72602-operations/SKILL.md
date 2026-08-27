---
name: socat-72602-operations
description: Use ONLY when operating the 72602-minipc socat egress bridge on port 17890, including proxy connectivity and host listener failures.
---

# socat Egress Bridge 72602 Operations

Operate the host egress bridge on `72602-minipc`. It connects cluster egress
to the local proxy path and is separate from mihomo's loopback listeners.

## Fixed scope

- Listener: `0.0.0.0:17890`.
- Upstream proxy owner: `mihomo-72602-operations`.
- Pod egress environment is expected to use `http://192.168.0.25:17890` and internal cluster addresses remain in `NO_PROXY`.

## Routine path

1. Read the listener/process/service status and confirm the upstream mihomo listener is available.
2. Test a harmless outbound request through `17890` from the intended cluster path; do not include credentials or response bodies unnecessarily.
3. Identify the actual host service/unit before changing it.
4. Verify listener availability, upstream connection, and a representative affected workload.

## Mutation and rollback

Before changing bind address, upstream target, service unit, or firewall path,
state target, current value, proposed value, blast radius, and rollback. Keep
the previous unit/config for rollback and never expose proxy credentials.
