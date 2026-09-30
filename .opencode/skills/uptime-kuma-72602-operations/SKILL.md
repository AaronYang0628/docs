---
name: uptime-kuma-72602-operations
description: Use ONLY when operating Uptime Kuma in the 72602 cluster, including monitors, notifications, persistence, and public access.
---

# Uptime Kuma 72602 Operations

Operate the Uptime Kuma resources in namespace `monitor`. The manifests live
in `manifests/uptimekuma/` and are applied directly; there is no Uptime Kuma
ArgoCD Application. Uptime Kuma is a monitoring consumer, so check the target
endpoint before changing a monitor.

## Fixed scope

- Namespace: `monitor`.
- Public entrypoint: `https://uptime.72602.space`.
- Monitor definitions and notification state are persistent application data; do not recreate them casually.

## Routine path

1. Read Deployment/Pod/service, Ingress/certificate, PVC, public login route, and recent monitor errors.
2. Test the affected target directly, including canonical HTTPS path and redirects, before editing a monitor.
3. Use the UI for application-owned monitor changes unless a reviewed Git source explicitly owns them; do not assume Homepage and Uptime Kuma share configuration.
4. Verify the target response, monitor state, notification path, Pod readiness, and PVC binding.

Apply deployment changes with `kubectl -n monitor apply -f manifests/uptimekuma/`.
Do not apply or recreate the PVC as part of routine monitor changes.

## Mutation and rollback

Before changing monitors, notification credentials, storage, or version,
state target, current value, proposed value, blast radius, and rollback. Use
the application's export/backup for monitor-data rollback and Git for
deployment rollback. Never print notification tokens or passwords.
