---
description: Check, publish, or upgrade the Sub2API release through its verified chart and GitOps workflow.
agent: build
---

Handle `/sub2api-release [check|publish|upgrade]` as the controlled Sub2API
release entrypoint. Load `helm-chart-mirror-operations` before any discovery.
When discovery includes live GitOps, ArgoCD, or Pod state, load
`sub2api-72602-operations` before the first cluster read; for `upgrade`, this
is mandatory before any cluster read.

Accept exactly one optional mode from `$ARGUMENTS`: `check`, `publish`, or
`upgrade`. Treat empty input as `check`. Parse the input as whitespace-separated
arguments and reject an unknown value, an empty quoted value, or any additional
argument before doing discovery or mutation. Show:
`Valid modes: check, publish, upgrade.`

`check` is read-only. Resolve and report the latest stable upstream GitHub
Release, current published mirror chart/application/image digest, provisional
next chart version, GitOps target revision, live ArgoCD/Pod release state, and
any update PR, workflow, GHCR, or publication blocker. Exclude drafts and
prereleases, and never infer the application release from a chart `appVersion`.
Do not dispatch workflows, make backups, change Git, merge, publish, or change
the cluster, and do not access Secrets.

For `publish` and `upgrade`, perform the same discovery and then present a
mutation preview before acting. The preview must state exact current and
proposed application version, chart version, and Linux-amd64 image digest,
the source and target repositories/packages/manifests, blast radius,
verification steps, and rollback. Name `Wei-Shaw/sub2api` as the application
release source, `AaronYang0628/helm-chart-mirror` as the Git package
repository, `charts/sub2api/sub2api-<chart-version>.tgz` and
`charts/index.yaml` as the package/index targets, and
`manifests/sub2api-argocd.yaml` as the GitOps manifest for `upgrade`. Mark the
next chart version as provisional until the update workflow resolves it. The
command invocation, an earlier request, or a pending workflow is not
confirmation. Wait for explicit confirmation after the preview. If the update
workflow resolves a different application/chart/digest tuple, stop before
merge or publication and ask for a new confirmation of the exact tuple.

After confirmed `publish`, follow `helm-chart-mirror-operations` exactly:

1. Read the local worktree status and preserve unrelated changes.
2. Before dispatch, verify that `AaronYang0628/helm-chart-mirror` `main`
   still contains the exact README marker required by
   `scripts/sub2api.sh update`: `  - **sub2api** chart version:`. If it is
   missing, restore that line through a branch and PR first and do not dispatch
   a doomed update. Re-run discovery after that prerequisite merges; request a
   new confirmation if the exact tuple changed.
3. Dispatch `Update Sub2API chart` on `main` and wait for a completed result.
   Inspect the generated `automation/sub2api-update` PR and its exact
   application/chart/Linux-amd64-digest tuple. A scheduled `already current`
   no-op is not a successful package publication; identify the last PR that
   actually added the current `.tgz` when reporting the current package.
4. Inspect the PR package, `charts/index.yaml`, README, script, workflow
   diff, and CI. Distinguish `Update Sub2API chart` CI from `Mirror consistency
   CI`. Run `bash scripts/sub2api.sh verify` and `git diff --check`.
5. If `Mirror consistency CI` fails because `assets/catalog.json` drifted from
   `charts/index.yaml`, run
   `python3 scripts/generate-catalog-json.py` on the same PR, commit only that
   generated correction, and wait for both `Update Sub2API chart` CI and
   `Mirror consistency CI` to succeed before merging.
6. Merge only the reviewed PR after the required CI jobs succeed. Preserve all
   previous chart packages and never overwrite an immutable chart version.
7. Wait for successful `Publish Sub2API chart` and Pages workflows on the
   merge commit. Accepted or pending workflow states are not success. If GHCR
   returns `403`, stop and direct the user to the package settings path in the
   loaded skill; do not manually publish with a PAT or any protected
   credential.
8. Independently perform an anonymous OCI Helm pull and compare its package
   SHA-256 with the Git package before reporting the chart as published.

The chart template is only
`oci://ghcr.io/ben-wangz/k8s-at-home-charts/sub2api`. Resolve application
versions from `Wei-Shaw/sub2api` GitHub Releases, never from a chart
`appVersion`, and publish only to
`oci://ghcr.io/aaronyang0628/helm-chart-mirror/sub2api`.

After confirmed `upgrade`, complete the verified chart publication first. Then
provide a separate cluster-mutation preview that identifies the final published
chart/image tuple, scoped PostgreSQL plus `/app/data` backup, one-line GitOps
manifest change, rolling migration risk, and Git/database rollback. Wait for
explicit confirmation of this cluster preview. On confirmation, follow
`sub2api-72602-operations`: take and verify a new scoped backup outside the
repository, change only the GitOps chart revision, commit and push only the
intended manifest, wait for ArgoCD, verify rollout, image digest, endpoints,
internal health, and dedicated Redis, and update the Sub2API runbook with
verified facts. Do not treat an accepted or pending ArgoCD sync as a
successful upgrade.

Never print or store passwords, GitHub tokens, API keys, Secret values,
provider credentials, cookies, or storage credentials. Preserve unrelated
worktree changes. Report exact verified facts and sanitized blockers; never
call an accepted or pending workflow a successful release.
