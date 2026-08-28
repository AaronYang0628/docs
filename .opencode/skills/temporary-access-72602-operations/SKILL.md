---
name: temporary-access-72602-operations
description: Use ONLY for the `/pass <IPv4>` command or temporary ECS access leases; grant and expire narrow one-hour Aliyun security-group rules from 72602-minipc.
---

# Temporary ECS Access 72602 Operations

This skill owns the explicit `/pass <IPv4>` emergency access lease. It is a
cloud security-group operation, not a way to discover the source address of a
Web request.

## Fixed policy

- The caller must provide exactly one literal IPv4 address.
- Reject IPv6, CIDR notation, hostnames, blank input, and multiple addresses.
- Grant only the source `/32` for:
  - TCP `22`
  - TCP `10021`
  - TCP `10022`
  - UDP `51820`
- Do not grant TCP `10023`, `10024`, `3128`, or `56396`.
- Default lease duration is exactly 3600 seconds.
- Repeating `/pass` for an active source must not extend its expiration.
- Each lease uses an `temporary-access-<expiry>-<nonce>` description so expiry
  cleanup can identify orphaned partial writes without touching updater-owned
  rules.

## Execution boundary

All live Aliyun mutations run on `72602-minipc`, using the approved Python
virtualenv and protected credential file recorded by `aliyun-72602-operations`.
Never invoke the Aliyun SDK from the Ops Agent Pod directly, from ZJLAB, or
from an arbitrary workstation.

Approved connection path from the Ops Agent Pod: `ssh minipc` uses the pod's
`~/.ssh/config` alias. The remote user is `aaron` with passwordless `sudo`.
The alias name is `minipc`, not `72602-minipc`.

The installed entrypoint is:

```text
/home/aaron/bin/temporary-ecs-access.sh
```

Invoke it through the approved host path:

```text
ssh minipc /home/aaron/bin/temporary-ecs-access.sh grant <ip>
```

The long-running cleanup is owned by:

```text
temporary-ecs-access.service
temporary-ecs-access.timer
```

The grant path and cleanup path share the existing security-group updater lock
so they cannot race the five-minute dynamic-IP reconciler. Lease state is
stored in a mode-0700 directory with mode-0600 files.

## Grant workflow

1. Validate the single IPv4 argument with `ipaddress`, and convert it to `/32`.
2. Acquire the shared updater lock.
3. Describe the target security group before changing it.
4. Remove only already-expired rules whose description matches the temporary
   lease format, by exact `SecurityGroupRuleId`.
5. If an active lease for that source exists, verify it and do not extend it.
6. Otherwise authorize four independent rules with the lease description.
7. Describe the group again and require all four exact protocol, port, source,
   direction, and description matches.
8. Persist the lease metadata atomically, without credentials.

If authorization partially fails, remove only the rules carrying the new lease
description. If cleanup also fails, the expiry encoded in the description lets
the timer retry safely. No unrelated rule is revoked.

## Expiry workflow

The timer invokes `temporary-ecs-access.sh cleanup` every minute and at boot.
It describes the group, finds only expired descriptions matching the exact
temporary format, revokes their recorded rule IDs, and verifies they are gone.
It also prunes state only after the cloud rules no longer exist. A failed
revoke is retained for the next retry and must be reported as a failure.

## Verification and rollback

Success requires fresh ECS API verification after grant or cleanup. Report the
source, lease ID, ports, expiry, and sanitized API result; never report
credentials or unrelated rule data.

Rollback for a still-active lease is the same script with the exact lease ID
through the approved host path, after inspecting the live rule IDs. Do not use
bulk security-group deletion and do not alter `update-sg-ip-*` rules.

This command changes Aliyun security-group rules only. It does not change ECS
UFW, WireGuard peer configuration, SSH configuration, HAProxy, DNS, or the
Kubernetes ingress. In particular, UDP `51820` is useful only where the client
has a compatible WireGuard path and the existing ECS/minipc firewall path also
permits it.
