---
name: mihomo-72602-operations
description: Use ONLY when operating Clash or mihomo on 72602-minipc, including proxy listeners, the external controller/UI, and cluster egress behavior.
---

# mihomo / Clash 72602 Operations

Operate the mihomo/Clash process on `72602-minipc`. The public Clash UI route
is represented by Homepage and ingress, but the proxy process and controller
are host services.

## Fixed scope

- HTTP proxy listener: `127.0.0.1:7890`.
- SOCKS5 proxy listener: `127.0.0.1:7891`.
- External controller/UI listener: `*:9090`.
- Cluster pod egress bridge is `192.168.0.25:17890`; never use LAN port `7890` as the pod egress address.
- Public UI verification uses the canonical HTTPS path `https://clash.72602.space/ui/`.

## Routine path

1. Read host listeners/process/service status and the controller/UI health without printing the proxy configuration or credentials.
2. Test the exact listener from its intended network scope: loopback for local proxy use, `17890` for cluster egress, and HTTPS `/ui/` for public UI.
3. For a configuration change, identify the actual host service/unit and preserve the current configuration privately for rollback.
4. Verify listener ownership, proxy connectivity, public UI HTTP 200, and affected cluster egress.

## Mutation and rollback

Before changing proxy mode, listeners, rules, credentials, or routing, state
target, current value, proposed value, blast radius, and rollback. Apply host
changes through the owning service method, preserve the previous config, and
reload only after validation. Never print provider credentials, proxy URLs with
credentials, or the full rule configuration.
