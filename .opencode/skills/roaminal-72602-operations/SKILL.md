---
name: roaminal-72602-operations
description: Use ONLY when operating the standalone Roaminal SSH/tmux/Codex web terminal in the 72602 cluster.
---

# Roaminal 72602 Operations

Operate the standalone `roaminal` release. It is a separate browser terminal
and SSH/tmux/Codex access path; it must not modify or replace the existing
OpenCode/Ops Agent deployment or the existing SSH tunnel services.

## Fixed scope and ownership

- Argo CD Application: `roaminal` in namespace `argocd`.
- Workload namespace: `roaminal`.
- Source: the pinned upstream Git Helm chart and its values in the
  repository's `manifests/roaminal-argocd.yaml`.
- Public host: `https://roam.72602.space`.
- The release uses its own PVC, login Secret, and SSH Secret. Never mount or
  read `opencode-ssh`, `opencode-basic-auth`, the Ops Agent PVC, or the
  existing tunnel credentials.

## Read path

1. Confirm the execution host and use the canonical `72602-minipc-local`
   connection for the local cluster.
2. Read the ArgoCD Application, rendered values, Deployment, Pod, Service,
   Ingress, Certificate, PVC, and Secret metadata. Never print Secret data.
3. Confirm the release has one `Recreate` Deployment, UID/GID 1000, no
   ServiceAccount token, no host networking, no hostPath, and no dependency on
   the existing OpenCode or SSH tunnel resources.
4. Test `/healthz`, authenticated browser access, TLS, WebSocket upgrade, and
   a full SSH login using only the dedicated Roaminal SSH configuration.
5. For Agent support, verify a live remote tmux target has `tmux` and Codex,
   then initialize the Agent through the Roaminal UI/API. Hook state is read
   through the live connection; it is not a network service.

## Dedicated SSH boundary

The Roaminal target path is provisioned separately from the existing SSH
tunnels. Use a dedicated key, `known_hosts`, SSH config, and authorized-key
entries. Do not point the Pod at host SSH configuration, `~/.ssh` through a
hostPath, an existing SSH Secret, or an existing tunnel listener. If a target
path is not yet provisioned, keep the application deployed but report the
missing transport instead of weakening this boundary.

## Mutation and rollback

Before changing the chart source, SSH transport, Secret metadata, or live
release, state the target, current value, proposed value, blast radius, and
rollback. Apply the smallest GitOps change, wait for ArgoCD convergence, and
verify the user-facing endpoint separately. Roll back the chart with a new Git
revert or the reviewed prior source revision. Roll back a dedicated SSH
transport independently; never restart or edit the existing tunnel units.

Do not expose SSH listeners, SSH keys, login passwords, access tokens, PVC
contents, or terminal output in logs, reports, documentation, or screenshots.
