+++
title = 'Zhejianglab'
date = 2024-03-07T15:00:59+08:00
weight = 26
+++

{{%children depth="999" description="false" showhidden="true" %}}

## Scope

ZJLAB operational inventory and network details are private. Public pages contain reusable application guidance only; verify dynamic state against the live cluster before applying a runbook.

## Access

```bash
ssh zjlab hostname
ssh zjlab 'kubectl get nodes'
ssh zjlab-backup hostname
```

The aliases are provisioned from private inventory and use an ECS ProxyJump to loopback-only reverse SSH listeners. Do not publish their resolved endpoints, ports, users, internal topology, or service names.

Detailed inventory and tunnel recovery procedures are maintained in the private `ops-private` repository with SOPS-encrypted values.

## Tunnel Health

ECS runs an independent check-and-alert-only monitor for the approved
`primary` and `backup` loopback listeners. For each label it requires exactly
one listener, loopback-only binding, sole `sshd` ownership, an independent
owner, a short-timeout SSH banner, and a stable hashed owner signature. Alerts
start only after three consecutive failures.

The monitor stores root-only state and emits labels and fixed reason codes only.
It never restarts or kills a tunnel and never changes sshd, firewall, cloud
network policy, DNS, keys, or endpoints. Real configuration and rollback details
remain in the private SOPS inventory; public pages must not reproduce them.

## Preflight

```bash
ssh zjlab 'kubectl config current-context'
ssh zjlab 'kubectl get nodes'
ssh zjlab 'kubectl get namespace'
ssh zjlab 'kubectl get applications.argoproj.io -A'
ssh zjlab 'kubectl get ingress,certificate -A'
```
