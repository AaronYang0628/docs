---
name: ecs-clash-operations
description: Use ONLY when checking or operating Clash or Mihomo on ECS, including process health, proxy listener exposure, and connectivity from 72602 or ZJLAB.
---

# ECS Clash Operations

Operate the Clash/Mihomo proxy hosted on the ECS. Discover the actual process,
service unit, listener, and configuration owner before assuming implementation
details or changing exposure.

## Fixed access path

- From `zjlab-ubuntu` and `72602-minipc`, use the canonical SSH alias `ecs-99`.
- Validate the execution host with `hostname` and the SSH configuration with
  `ssh -G ecs-99`; never resolve an SSH alias through DNS.
- The ECS public address is `47.110.67.161`; the private WireGuard address is
  `10.77.0.1`.
- `mihomo.service` owns the proxy. TCP `7890` is the authenticated HTTP proxy;
  TCP `7891` is an authenticated SOCKS listener. Both listen on all interfaces.
- The authenticated external controller API listens on TCP `56396`. ZJLAB has
  source-restricted security-group access; the 72602 rule is separate.
- Controller authentication on `56396` is distinct from proxy authentication on
  `7890`/`7891`. Never use the controller credential as a proxy username or
  password.
- Last verified 2026-11-03: `api64.ipify.org` routes through `🔰 节点选择`,
  currently `美国圣何塞`. The authenticated egress probes returned HTTP `403`
  or `000`; the exit country remains unverified.
- 72602 reaches `10.77.0.1:7890` over WireGuard. ZJLAB reaches
  `47.110.67.161:7890`; the current Aliyun security-group rule permits TCP
  `7890` only from the current ZJLAB egress address.
- Last verified 2026-11-02: service active; unauthenticated requests from both
  client paths received HTTP `407`. This confirms network reachability, not
  authenticated proxy egress. Configure the required proxy authentication in
  the consuming application's secret store.
- ECS UFW currently allows TCP `7890` from any source. Keep the Aliyun
  security-group source restriction in place; do not add a broad cloud rule.

## Routine path

1. On ECS, identify the proxy process, owning system or user service, listening
   sockets, recent service status, and logs. Avoid exposing command arguments,
   configuration contents, credentials, or subscription URLs.
2. Reconfirm the source address and current Aliyun rule before changing
   exposure. Check host firewall and Aliyun security-group ownership before
   attributing a failed connection to the proxy.
3. Test the discovered endpoint from ECS itself, from 72602, and from ZJLAB
   independently. Use a non-sensitive proxy request and report whether each
   network path succeeds.
4. Confirm the listener owner, service health, and client-side request result
   before declaring the service usable.
5. Verify actual country through a successful egress probe; a selected node name
   or controller delay result does not prove the exit country.

## Mutation and rollback

Before changing listener binding, authentication, host firewall, security
groups, or routing, state the target, current value, proposed value, source
networks, blast radius, and rollback. Keep access limited to the required
72602 and ZJLAB source paths. For Aliyun security-group changes, load
`aliyun-72602-operations` and follow its mutation and verification path. Preserve
the current service configuration privately and use the owning service's
reload/restart method. Verify service health and proxy requests from both
networks after every change. Never print proxy credentials, provider keys,
subscription URLs, or full proxy configuration.
