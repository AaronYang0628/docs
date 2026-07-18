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

## Preflight

```bash
ssh zjlab 'kubectl config current-context'
ssh zjlab 'kubectl get nodes'
ssh zjlab 'kubectl get namespace'
ssh zjlab 'kubectl get applications.argoproj.io -A'
ssh zjlab 'kubectl get ingress,certificate -A'
```
