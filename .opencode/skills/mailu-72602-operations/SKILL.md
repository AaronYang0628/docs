---
name: mailu-72602-operations
description: Use ONLY when operating Mailu in the 72602 cluster, including mail services, webmail, admin, storage, queues, and mail ingress/egress.
---

# Mailu 72602 Operations

Operate the Mailu Application in namespace `mailu`. Mailu is a composed mail
stack, so diagnose the named component without treating a healthy sibling as
proof that the whole mail path works.

## Fixed scope

- ArgoCD Application: `mailu`.
- Namespace: `mailu`.
- Components include admin, front, Postfix, Dovecot, Rspamd, Webmail, ClamAV, Tika, Oletools, and Redis.
- HostPort/ECS forwarding is owned by `mail-routing-72602-operations`; do not change it from this skill.
- Public web TLS and ingress use the shared ingress/cert-manager path.

## Routine path

1. Read Application health, the affected component Pods/Services, mail queue/status, storage, and recent events/logs.
2. Classify the issue as SMTP ingress, SMTP delivery, IMAP, webmail/admin, filtering, or external forwarding before changing anything.
3. For GitOps changes, update the Mailu source and inspect rendered diffs; preserve existing mail data and secrets.
4. Verify the affected protocol end to end, component readiness, queue behavior, storage binding, and external forwarding when relevant.

## Mutation and rollback

Before changing mail domains, credentials, routing, storage, filtering, or
version, state target, current value, proposed value, blast radius, and
rollback. Use Git for configuration rollback and an explicit mail/data backup
for data rollback. Never print mailbox passwords, DKIM keys, TLS keys, or mail
contents.
