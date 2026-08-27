---
name: reverse-tunnel-72602-operations
description: Use ONLY when operating the 72602-minipc ECS reverse tunnels, including user systemd units reverse-tunnel-ecs-10021 and reverse-tunnel-ecs-10022.
---

# ECS Reverse Tunnels 72602 Operations

Operate the user-level reverse tunnels between `72602-minipc` and the ECS.
They are external access dependencies and must be checked separately from
Kubernetes ingress.

## Fixed scope

- User services: `reverse-tunnel-ecs-10021` and `reverse-tunnel-ecs-10022`.
- `10021`: ZJLAB rescue path.
- `10022`: backup SSH and Mailu loopback forwards.
- SSH tunnels no longer carry Web `80/443`; Web traffic uses WireGuard as primary and the independent ECS SSH path as backup through HAProxy.

## Routine path

1. Read both user systemd unit status, recent journal output, listening sockets, and ECS-side connectivity without printing private keys or command-line secrets.
2. Test only the path relevant to the incident: ZJLAB rescue, backup SSH, or Mailu mail forwarding.
3. Preserve the working tunnel and identify the exact unit/config owner before restarting or editing it.
4. Verify the tunnel session, forwarded listener, target service, and external behavior.

## Mutation and rollback

Before restarting, changing, or replacing a tunnel, state target, current
value, proposed value, blast radius, and rollback. Keep the other path intact
as a fallback, use the host service's normal reload/restart, and restore the
previous unit/config on rollback. Never print SSH keys or tunnel credentials.
