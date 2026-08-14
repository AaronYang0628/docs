---
name: ops-docs-72602-operations
description: Use ONLY when operating the 72602 Ops Docs publishing application, including Hugo content delivery, build hooks, revision markers, and publication verification.
---

# Ops Docs 72602 Operations

Operate the `application/ops-docs` GitOps publication path. The repository is
the source of truth for manifests and content; the build hook publishes the
rendered Hugo site.

## Fixed scope

- ArgoCD Application: `ops-docs` in namespace `application`.
- Source repository: `https://github.com/AaronYang0628/docs.git`.
- Public host: `https://ops.docs.72602.space`.
- `manifests/configmap.yaml` carries `PUBLISH_REVISION`; the build hook clones that exact revision.
- `ops-docs` manages child Application declarations and shared application resources. Child resources remain owned by their own GitOps sources.

## Revision rule

Always obtain the exact revision with `git rev-parse <ref>` and write that
value through the normal source edit. Never hand-type a full SHA, use an
unpublished local SHA, or leave an old marker after changing content. The
previous failure `upload-pack: not our ref` was caused by an incorrect marker.

## Routine path

1. Read ArgoCD sync/health, the build hook status/logs, ConfigMap marker, and public marker/page.
2. For content work, use `hugo-doc-maintainer`; for manifests, update the repository source and inspect the rendered diff.
3. Publish only the intended commit, wait for `ops-docs-build`, and do not repeatedly trigger a hook with the same bad marker.
4. Verify ArgoCD `Synced/Healthy`, hook success, live marker equality with `git rev-parse`, and affected page HTTP status/content.

## Mutation and rollback

Before changing publication configuration, state target, current value,
proposed value, blast radius, and rollback. Roll back with a new Git revert
and a correct exact marker. Do not patch the live ConfigMap or delete a build
Job as a substitute for fixing the source.
