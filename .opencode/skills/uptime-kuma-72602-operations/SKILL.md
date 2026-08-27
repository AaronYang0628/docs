---
name: uptime-kuma-72602-operations
description: Use ONLY when operating Uptime Kuma in the 72602 cluster, including monitors, notifications, persistence, and public access.
---

# Uptime Kuma 72602 Operations

Operate the Uptime Kuma Application in namespace `monitor`. Uptime Kuma is a
monitoring consumer; its reported status must be checked against the target
endpoint before changing the monitor.

## Fixed scope

- ArgoCD Application: `uptime-kuma`.
- Namespace: `monitor`.
- Public entrypoint: `https://uptime.72602.space`.
- Monitor definitions and notification state are persistent application data; do not recreate them casually.

## Routine path

1. Read Application health, Deployment/Pod/service, persistence, public login route, and recent monitor errors.
2. Test the affected target directly, including canonical HTTPS path and redirects, before editing a monitor.
3. Use the UI for application-owned monitor changes unless a reviewed Git source explicitly owns them; do not assume Homepage and Uptime Kuma share configuration.
4. Verify the target response, monitor state, notification path, Pod readiness, and PVC binding.

## Mutation and rollback

Before changing monitors, notification credentials, storage, or version,
state target, current value, proposed value, blast radius, and rollback. Use
the application's export/backup for monitor-data rollback and Git for
deployment rollback. Never print notification tokens or passwords.
