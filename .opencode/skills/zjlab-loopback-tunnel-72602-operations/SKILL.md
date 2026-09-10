---
name: zjlab-loopback-tunnel-72602-operations
description: Use ONLY when operating the ZJLAB ECS loopback SSH reverse tunnels on ports 10023, 10024, or 10025, their health checker, or the matching ProxyJump aliases.
---

# ZJLAB Loopback Tunnel Operations

Operate the private ZJLAB SSH reverse path used by the 72602 ProxyJump aliases.
This path is separate from the public 72602 reverse tunnels on ports 10021 and
10022.

## Fixed scope and ownership

- ECS loopback listeners: `127.0.0.1:10023` primary, `:10024` backup, and
  `:10025` restricted maintenance.
- ZJLAB initiators: system services
  `zjlab-loopback-reverse-primary.service`,
  `zjlab-loopback-reverse-backup.service`, and
  `zjlab-loopback-maintenance.service`.
- ECS health checker: `/opt/tunnel-monitor/check-zjlab-reverse-tunnels.sh`
  supervised by `zjlab-tunnel-healthcheck.service` and its timer.
- Management path: `ecs-99`, reached from `72602-minipc`.
- Client paths: `zjlab-ubuntu-proxy` (10023), `zjlab-ubuntu-backup` (10024),
  and `zjlab-maintenance` (10025).

## Routine read path

1. Confirm `hostname` and validate SSH aliases with `ssh -G`; do not use DNS
   lookup for aliases.
2. Keep a direct `ecs-99` session available before touching any tunnel.
3. On ECS, read the three listener sockets, listener count and process owner,
   relevant systemd unit status and journal, effective SSH settings for the
   tunnel accounts, and health-check timer/service results.
4. Run the matching alias through a complete SSH login and inspect the SSH
   banner. A systemd `active` state alone is not proof of a working forward.
5. Treat `10025` as a separate credential and listener, not an independent
   network path; all three connections share the ZJLAB-to-ECS route.

## Health-check mutation path

Before changing the checker, save the current file as a new root-only backup,
verify the known-good backup, and install changes atomically. Require:

- `bash -n /opt/tunnel-monitor/check-zjlab-reverse-tunnels.sh`
- `--dry-run` completion
- one `zjlab-tunnel-healthcheck.service` run with journal and exit status
- subsequent timer state verification

Preserve `FAILURE_THRESHOLD=10`, `BANNER_TIMEOUT=30`, and the `ssh-keyscan`
probe unless an explicitly verified live requirement changes. Never replace the
complete SSH key exchange with a raw TCP banner read.

## Mutation and rollback

Before a live tunnel change, state the target unit, current value, proposed
value, blast radius, and rollback. Change only the affected ZJLAB system unit;
keep the other tunnel and direct `ecs-99` management path intact. Verify the
listener, banner, full SSH login, and service journal after every change.

Rollback restores the saved unit or checker backup and restarts only the
affected ZJLAB unit or `zjlab-tunnel-healthcheck.service`. Never restart the
whole ECS `sshd`, kill all `sshd` processes, enable legacy user-level duplicate
units, or expose ports `10023`, `10024`, or `10025` through the security group
or public interfaces. Do not print keys, passwords, tokens, Push URLs, or
private inventory values.
