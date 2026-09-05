---
name: helm-chart-mirror-operations
description: Use ONLY when operating the AaronYang0628/helm-chart-mirror repository, its Sub2API chart mirror, GitHub Actions update PRs, GitHub Pages index, or GHCR OCI publication.
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

The initial mirrored release is chart `0.1.11`, application `0.2.0`, with the
Linux amd64 image pinned by its resolved registry digest. Never infer a new
application version from the upstream chart's `appVersion`; resolve the
stable release and image manifest by command.

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
- The update path opens a PR only. Do not auto-merge or deploy a release from
  this automation.

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
- The GHCR package must be public. One-time package visibility is managed in
  GitHub package settings; the publish workflow deliberately fails when the
  anonymous pull cannot read the package.
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
