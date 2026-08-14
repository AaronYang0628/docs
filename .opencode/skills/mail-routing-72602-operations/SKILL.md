---
name: mail-routing-72602-operations
description: Use ONLY when operating the external Mailu hostPort and ECS mail-forwarding path for 72602, including tunnel and HAProxy dependencies.
---

# Mail Routing 72602 Operations

Operate the external mail transport around Mailu. This skill owns forwarding
between ECS and the cluster; Mailu application behavior belongs to
`mailu-72602-operations`.

## Fixed scope

- Mailu hostPort and ECS mail forwards are outside the Mailu ArgoCD Application.
- The `reverse-tunnel-ecs-10022` path carries backup SSH and Mailu loopback forwards.
- ECS HAProxy/mail passthrough is covered by `haproxy-72602-operations`.
- The cluster mail destination and protocol listeners must be read live; do not invent ports from a web route.

## Routine path

1. Classify the failure as DNS, ECS listener, HAProxy, reverse tunnel, hostPort, Mailu front, SMTP, IMAP, or delivery before changing anything.
2. Read the relevant ECS/minipc listener, tunnel, HAProxy backend, Kubernetes Service/EndpointSlice, and Mailu component health.
3. Test the exact mail protocol end to end with non-sensitive metadata only.
4. Verify both the external forwarding path and Mailu's receiving/delivery state.

## Mutation and rollback

Before changing a forward, listener, firewall, tunnel, or mail route, state
target, current value, proposed value, blast radius, and rollback. Preserve
the existing route and reverse tunnel, apply through the actual host owner,
and restore the previous configuration on rollback. Never print mailbox
credentials, DKIM material, TLS keys, or mail contents.
