---
name: haproxy-72602-operations
description: Use ONLY when operating the ECS HAProxy Web or Mail passthrough for 72602, including public entrypoints, backends, and failover.
---

# ECS HAProxy 72602 Operations

Operate HAProxy on the Aliyun ECS that fronts 72602. HAProxy is external to
the cluster and must be diagnosed separately from ingress-nginx.

## Fixed scope

- Public Web listeners: ECS `:80` and `:443`.
- Web primary transport: WireGuard UDP `51820` to minipc NodePorts `32080/32443`.
- Web backup: independent ECS-loopback SSH tunnel.
- Web TLS passthrough: TLS terminates at ingress-nginx; do not add ECS TLS termination or PROXY protocol without an explicit design change.
- Mail passthrough is part of the external path and is also covered by `mail-routing-72602-operations`.

## Routine path

1. Read HAProxy service/config status, frontend/backend health, ECS listeners, WireGuard path, SSH fallback, and minipc NodePorts.
2. Test the affected public hostname and protocol, then test the selected backend path without exposing response credentials.
3. Identify the ECS config/service owner before editing or reloading.
4. Verify HAProxy config syntax, reload result, both fallback paths, TLS handshake at ingress, and public endpoint status.

## Mutation and rollback

Before changing frontends, backends, ACLs, timeouts, or passthrough mode, state
target, current value, proposed value, blast radius, and rollback. Validate
configuration before reload, keep the previous config and a working fallback,
and never print certificates, private keys, or auth headers.
