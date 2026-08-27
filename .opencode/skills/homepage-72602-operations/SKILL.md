---
name: homepage-72602-operations
description: Use ONLY when operating Homepage in the 72602 cluster, including service links, site monitors, generated ConfigMaps, checksums, and the public portal.
---

# Homepage 72602 Operations

Operate the Homepage Application in namespace `monitor`. The repository
configuration is canonical; generated ConfigMaps and deployment checksums
must be produced by the repository script.

## Fixed scope

- ArgoCD Application: `homepage`.
- Namespace: `monitor`.
- Public portal: `https://port.72602.space`.
- Source service definitions: `manifests/homepage/config/services.yaml`.
- Regenerate the ConfigMap with `scripts/gen-homepage-configmap.sh`; do not hand-edit the generated ConfigMap.
- When a monitored service redirects HTTP to HTTPS, use its canonical HTTPS URL and trailing slash in both `href` and `siteMonitor` when that path is the stable 200 endpoint.
- The Clash UI monitor is fixed at `https://clash.72602.space/ui/`; do not restore the old HTTP monitor.

## Routine path

1. Read the live ConfigMap, Deployment checksum, Pod readiness, and Homepage logs.
2. Test the exact monitored URL from the Homepage runtime path; distinguish a monitor-client error from the backend's HTTP status.
3. Edit `services.yaml`, run the generator, review generated diff and checksum, then commit/push through GitOps.
4. Verify the live ConfigMap, Deployment rollout, Pod restart count, relevant monitor error count, monitored endpoint, and public portal.

## Mutation and rollback

Before changing a service link, monitor URL, widget credential, or generated
configuration, state target, current value, proposed value, blast radius, and
rollback. Roll back the source file and regenerate; never patch the live
ConfigMap as a second ownership path. Do not print API keys or widget tokens.
