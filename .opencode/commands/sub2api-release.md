---
description: Check, publish, or upgrade the Sub2API release through its verified chart and GitOps workflow.
agent: build
---

Use this as a mode dispatcher. The loaded operation skills are the source of
truth for discovery, safeguards, mutation steps, verification, and rollback;
do not duplicate or override their procedures here. Load
`helm-chart-mirror-operations` before release discovery and
`sub2api-72602-operations` before any live cluster read or cluster mutation.

The full optional mode is passed as `$ARGUMENTS`. Empty input means `check`;
otherwise accept exactly one token: `check`, `publish`, or `upgrade`. Stop before
tools or discovery for any other input or additional token, and reply:
`Valid modes: check, publish, upgrade.` Do not attempt to distinguish an empty
quoted argument from empty input; command expansion does not preserve that
distinction.

For `check`, follow the skill's read-only discovery procedure. Do not dispatch
workflows, make backups, change Git, merge, publish, mutate the cluster, or
access Secrets.

For `publish` and `upgrade`, complete discovery and present the skill-required
preview before any mutation. Wait for explicit confirmation; the command
invocation or an earlier request is not confirmation. If an update workflow
resolves a different application/chart/image tuple, stop and request
confirmation of that exact tuple before merge or publication.

After confirmation for `publish`, follow `helm-chart-mirror-operations` end to
end, including its README preflight, update workflow, PR and CI review, merge,
GHCR/Pages checks, and independent anonymous pull. A no-op run is not a
publication; pending checks are not success. Preserve existing chart packages
and never use a protected credential as a manual publishing fallback.

For confirmed `upgrade`, first finish and verify chart publication. Then
present a separate cluster-upgrade preview and wait for its explicit
confirmation. Only afterward follow `sub2api-72602-operations` for the scoped
backup, single manifest revision change, rollout verification, and runbook
update. A pending ArgoCD sync is not a successful upgrade.

Never print or store passwords, GitHub tokens, API keys, Secret values,
provider credentials, cookies, or storage credentials. Preserve unrelated
worktree changes. Report exact verified facts and sanitized blockers; never
call an accepted or pending workflow a successful release.
