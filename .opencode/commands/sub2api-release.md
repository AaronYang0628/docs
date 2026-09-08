---
description: Check, publish, or upgrade the Sub2API release through its verified chart and GitOps workflow.
agent: build
---

Handle `/sub2api-release [check|publish|upgrade]` as the controlled Sub2API
release entrypoint. Load `helm-chart-mirror-operations` first. For `upgrade`,
also load `sub2api-72602-operations` before any cluster read.

Accept exactly one optional mode from `$ARGUMENTS`: `check`, `publish`, or
`upgrade`. Treat empty input as `check`. Reject any other value or additional
arguments and show the valid modes.

`check` is read-only. Resolve and report the latest stable upstream GitHub
Release, current published mirror chart/application/image digest, provisional
next chart version, GitOps target revision, live ArgoCD/Pod release state, and
any update PR, workflow, GHCR, or publication blocker. Exclude drafts and
prereleases, and never infer the application release from a chart `appVersion`.
Do not dispatch workflows, make backups, change Git, merge, publish, or change
the cluster.

For `publish` and `upgrade`, perform the same discovery and then present a
mutation preview before acting. It must state exact current and proposed
application/chart/Linux-amd64-digest values, target repositories/manifests,
blast radius, verification steps, and rollback. The command invocation is not
confirmation. Wait for explicit confirmation after the preview. If the update
workflow resolves a different version/chart/digest tuple, stop and ask for a
new exact confirmation.

After confirmed `publish`, follow `helm-chart-mirror-operations` exactly:
dispatch the update workflow, inspect the generated PR and successful CI, run
the package verifier and diff check, merge the reviewed PR, wait for the GHCR
publish and Pages workflows, then independently verify an anonymous OCI Helm
pull against the Git package SHA-256. Never overwrite published chart versions.
If GHCR returns `403`, stop and direct the user to the package settings path in
the loaded skill; do not manually publish with a PAT or any protected
credential.

After confirmed `upgrade`, complete the verified chart publication first. Then
provide a separate cluster-mutation preview that identifies the final published
chart/image tuple, scoped PostgreSQL plus `/app/data` backup, one-line GitOps
manifest change, rolling migration risk, and Git/database rollback. Wait for
explicit confirmation of this cluster preview. On confirmation, follow
`sub2api-72602-operations`: take and verify a new scoped backup, change only
the GitOps chart revision, commit and push only intended files, wait for ArgoCD,
verify rollout/image digest/endpoints/internal health/Redis, and update the
Sub2API runbook.

Never print or store passwords, GitHub tokens, API keys, Secret values,
provider credentials, cookies, or storage credentials. Preserve unrelated
worktree changes. Report exact verified facts and sanitized blockers; never
call an accepted or pending workflow a successful release.
