---
name: wireguard-72602-operations
description: Use ONLY when operating the 72602 Web WireGuard tunnel between ECS and 72602-minipc, including routing, peer health, and failover.
---

# WireGuard Web Tunnel 72602 Operations

Operate the ECS-to-minipc Web transport. WireGuard is a network path, not an
application ingress controller; route and TLS ownership remain with HAProxy,
ingress-nginx, and cert-manager.

## Fixed scope

- Web tunnel transport: UDP `51820`.
- Primary Web path: ECS HAProxy through WireGuard to minipc NodePorts `32080/32443`.
- Backup Web path: independent ECS loopback SSH tunnel; preserve it during WireGuard work.
- TLS terminates at ingress-nginx, not ECS HAProxy.

## Routine path

1. Read WireGuard interface/peer handshake and byte counters on both ends, route state, HAProxy backend health, and ingress NodePorts.
2. Test the public HTTP/HTTPS route and distinguish transport failure from ingress/TLS/backend failure.
3. Identify the actual host/system service owner before changing keys, routes, MTU, or firewall rules.
4. Verify a fresh peer handshake, byte flow, HAProxy backend, NodePort reachability, TLS certificate, and public endpoint.

## Mutation and rollback

Before changing peer keys, routes, MTU, listen port, or firewall policy, state
target, current value, proposed value, blast radius, and rollback. Preserve
the SSH fallback and previous peer configuration, and apply changes with an
out-of-band recovery path. Never print private keys or preshared keys.
