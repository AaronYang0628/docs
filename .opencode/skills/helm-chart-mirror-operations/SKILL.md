---
name: helm-chart-mirror-operations
description: Use ONLY when operating the AaronYang0628/helm-chart-mirror repository, its Sub2API chart mirror, /sub2api-release check or publish, GitHub Actions update PRs, GitHub Pages index, or GHCR OCI publication.
---

# Helm Chart Mirror Operations

Operate the `AaronYang0628/helm-chart-mirror` GitHub repository for chart
mirroring and publication. This is repository automation work, not a request
to change the deployed Sub2API workload. Load `sub2api-72602-operations` for
live 72602 application or GitOps work.

## Fixed facts

- Repository: `https://github.com/AaronYang0628/helm-chart-mirror`
- Helm repository: `https://aaronyang0628.github.io/helm-chart-mirror/charts`
- Sub2API package path: `charts/sub2api/sub2api-<chart-version>.tgz`
- Helm index: `charts/index.yaml`
- Upstream chart source: `oci://ghcr.io/ben-wangz/k8s-at-home-charts/sub2api`
- Upstream release API: `https://api.github.com/repos/Wei-Shaw/sub2api/releases`
- Application image: `ghcr.io/wei-shaw/sub2api`
- Published OCI chart: `oci://ghcr.io/aaronyang0628/helm-chart-mirror/sub2api`
- Pages deployment is owned by `.github/workflows/jekyll-gh-pages.yml` and is
  triggered by a push to `main`.

The last verified mirror release on 2026-09-05 is chart `0.1.12`, application
`0.2.1`, with Linux amd64 image digest
`sha256:86d605217e7ebdb60a70316a458446cd51c2da207a8b2128661a2cb9caaf9aab`.
This is historical evidence, not a release target. Never infer a new
application version from the upstream chart's `appVersion`; resolve the
latest stable release and image manifest by command.

## Automation ownership

- `.github/workflows/chart-ci.yml` runs `scripts/sub2api.sh verify` on relevant
  pull requests and pushes.
- `.github/workflows/update-sub2api.yml` runs daily or by manual dispatch. It
  resolves the latest stable release, pulls the upstream OCI chart, increments
  the mirror chart patch version, updates the image tag and digest, rebuilds
  the package, regenerates the index, and opens a PR from
  `automation/sub2api-update`.
- `.github/workflows/publish-sub2api.yml` runs after a merged PR, verifies each
  newly merged package, publishes it to GHCR, and anonymously pulls it back to
  prove that the public OCI content matches Git.
- The update path opens a PR only. It never auto-merges or deploys a release.

## Sub2API Release Modes

### Check

For `/sub2api-release` or `/sub2api-release check`, perform read-only discovery:

1. Resolve the latest stable GitHub Release from `Wei-Shaw/sub2api`; exclude
   drafts and prereleases.
2. Inspect the newest mirror package, `charts/index.yaml`, published OCI chart,
   image tag/digest, and open update PR/workflow state.
3. Resolve the Linux amd64 image manifest digest for the upstream release.
4. Report the upstream release, current mirror chart/application/digest,
   whether an update is needed, and provisional next chart version.

Do not dispatch workflows, create branches or PRs, merge, publish, or change
the 72602 cluster in check mode.

### Publish Preview And Confirmation

For `/sub2api-release publish` or the chart stage of `upgrade`, first give a
read-only preview containing the current and proposed application/chart/image
tuple, affected GitHub repository/package, workflow/PR behavior, blast radius,
and rollback. The command mode alone is not approval; wait for explicit user
confirmation before dispatching the update workflow.

If the update workflow resolves a version or Linux amd64 digest that differs
from the confirmed tuple, stop before merging and request confirmation again.

### Confirmed Publication Path

1. Read `git status --short --branch`; preserve unrelated worktree changes.
2. Dispatch `Update Sub2API chart` on `main` and wait for it to finish.
3. Inspect the generated `automation/sub2api-update` PR, package, index,
   README, script, workflow diff, and CI. Run `bash scripts/sub2api.sh verify`
   on the proposed package and `git diff --check`.
4. Merge only the reviewed, successful PR. Preserve previous chart packages.
5. Wait for `Publish Sub2API chart` and Pages workflows on the merge commit.
   The publish workflow must complete successfully and anonymously pull the
   OCI chart back with matching package SHA-256.
6. Independently repeat the anonymous Helm pull and compare package SHA-256
   before reporting the chart as published.
7. Report the Git/PR/workflow URLs or SHAs, final chart/application/digest,
   and exact verification result. Do not update the cluster unless the user
   explicitly requested `upgrade` and confirms its separate cluster preview.

## Read path

1. Read `git status --short --branch` and preserve unrelated worktree changes.
2. Inspect the package with `helm show chart`, `helm show values`, and the
   index entry in `charts/index.yaml`.
3. Run `bash scripts/sub2api.sh verify` before treating a package as valid.
   Verification includes Helm lint, template rendering, package/index digest
   agreement, image repository/tag agreement, Linux amd64 manifest selection,
   and registry digest agreement.
4. For GitHub Actions work, inspect the workflow run and PR rather than
   editing generated package metadata by hand.

## Mutation path

- Routine updates use `workflow_dispatch` on `Update Sub2API chart` or wait for
  its schedule. Manual repository changes must use a branch and PR.
- Do not hand-type image digests or release SHAs. Use the update script's
  registry and GitHub API resolution.
- Preserve prior chart packages. Chart versions are immutable publication
  identifiers; never replace an existing `.tgz` with different content.
- The GHCR package must be public. The package settings URL is
  `https://github.com/users/AaronYang0628/packages/container/helm-chart-mirror%2Fsub2api/settings`.
  The repository `AaronYang0628/helm-chart-mirror` must have `Write` under
  **Manage Actions access** so its `GITHUB_TOKEN` can publish. Repository
  association may remain `null`; it is not evidence that Actions access failed.
- If GHCR publishing returns `403`, stop. Do not fall back to a PAT or manually
  publish with a protected credential. Report the package settings path and
  request that the repository be granted `Write`, then rerun the failed publish
  workflow after the user confirms the setting.
- Required GitHub Actions permissions are `contents: write` and
  `pull-requests: write` for the update workflow, and `packages: write` for
  the publish workflow. Repository settings must allow Actions to create pull
  requests.
- Do not put registry credentials, GitHub tokens, application secrets, or
  Kubernetes credentials in the repository or workflow output.

## Verification and rollback

After changing the mirror repository:

1. Run `bash scripts/sub2api.sh verify` for the latest package.
2. Run `git diff --check` and inspect the package, index, README, script, and
   workflow diff.
3. After a merged update, verify the GHCR package by an anonymous Helm pull
   and confirm the Pages workflow completed for the `main` push.

Rollback is a new revert PR for the repository and Pages content. Do not
delete or overwrite an already published chart version in GHCR. A chart
rollback does not roll back a running 72602 deployment; follow the
`sub2api-72602-operations` GitOps and database-backup path for that operation.
