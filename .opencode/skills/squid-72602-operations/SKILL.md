---
name: squid-72602-operations
description: Use ONLY when operating the Squid forward proxy on 72602 ECS ecs-99, including public port 3128 connectivity, configuration, limits, logs, and egress verification.
---

# ECS Squid 72602 Operations

Operate the external Squid forward proxy on Aliyun ECS `ecs-99`
(`47.110.67.161`), public listener `:3128`. The service is outside k3s and
must be diagnosed separately from HAProxy, mihomo, and cluster ingress.

## Fixed ownership and boundary

- Execution boundary: `72602-minipc` through the `72602-k3s-maintainer` agent.
- Host: Aliyun ECS `ecs-99`, public address `47.110.67.161`.
- Service: Squid, public HTTP proxy listener `:3128`.
- Do not expose proxy credentials, access keys, or full authenticated URLs.

## Routine read path

1. Confirm the host identity and approved SSH path.
2. Read Squid service/config status, listener ownership, process/file limits,
   TCP listen/overflow/drop counters, conntrack/resource pressure, firewall
   rules, and recent Squid/system logs.
3. Reproduce with repeated HTTP and HTTPS proxy requests and a direct control
   path, recording status, connection success rate, and phase timings.
4. Identify the exact owner of any changed setting before mutation.

## Mutation and rollback

Before changing a setting, state the current value, proposed value, blast
radius, and rollback. Preserve a timestamped copy of the active Squid config,
validate with `squid -k parse`, and use the service's normal reload/restart
path. Prefer bounded listener/resource fixes over broad firewall changes. Keep
the previous config and restore it if verification regresses.

## Verification

Verify the service is active, `:3128` is listening, Squid logs show accepted
requests without new errors, and repeated proxy checks have no connection
timeouts. Test both HTTP and HTTPS targets plus a direct control request; report
remaining egress or target-site latency separately from proxy listener health.
