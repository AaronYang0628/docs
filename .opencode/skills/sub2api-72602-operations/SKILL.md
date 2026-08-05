---
name: sub2api-72602-operations
description: Use when operating Sub2API in the 72602 cluster, including admin diagnostics, account scheduling, user RPM or concurrency controls, model availability, and exact-account balance recharge.
---

# Sub2API 72602 Operations

Operate the `application/sub2api` deployment only in the 72602 cluster. Delegate live work to `72602-k3s-maintainer`; use the `sub2api-admin_*` MCP tools for authenticated application operations and Kubernetes/ArgoCD tools for deployment state.

## Boundaries

- Internal admin endpoint: `http://sub2api.application.svc.cluster.local:8080`.
- Public verification endpoint: `https://token.72602.space`.
- Authentication uses the dedicated `application/sub2api-mcp` Secret key `admin-api-key`. The MCP process receives it through `SUB2API_ADMIN_API_KEY`; never place it in `opencode.json`.
- The deployed application is authoritative for runtime state. Git owns Helm/deployment configuration, while PostgreSQL and Redis own admin settings and scheduler state.
- Never read, print, return, or store administrator passwords, JWTs, API keys, provider credentials, OAuth codes, cookies, or storage credentials.
- Use `sub2api-admin_read` only for its reviewed GET route allowlist. The MCP exposes no generic authenticated write tool.
- Before every mutation, state the exact target, current value, proposed value, blast radius, and rollback. Obtain explicit user confirmation after showing this preview.
- Generate one stable UUID or equivalent 16-128 character idempotency key before recharge. Keep and reuse that same key if the result is uncertain; never generate a new key for a retry.
- Other dedicated changes are set operations without confirmed backend idempotency replay. Re-read current state before retrying them.
- Report the exact `verified` or `accepted_unverified` outcome for every dedicated change. Never rewrite an unverified accepted response as success.

## Balance Recharge

Balance is a USD-style internal credit in Sub2API v0.1.168, not a declared fiat currency account.

1. Require an exact email address and positive amount from the user.
2. Call `sub2api-admin_preview_recharge`. The server fuzzy-searches but accepts only one exact normalized email match.
3. Report the matched email, immutable user ID, status, current balance, amount, and expected balance.
4. Ask the user to confirm that exact tuple. Do not treat an earlier ambiguous request as confirmation.
5. Call `sub2api-admin_recharge` with the exact email and ID, operation `add`, an audit note, and the stable idempotency key. Never recharge through user `update`.
6. If the call times out or returns an uncertain result, inspect the user and balance history first. Retry only with the same idempotency key.
7. Report the tool's exact `verified` or `accepted_unverified` outcome, before/after balances, balance-history evidence, and any verification warning. Never rewrite `accepted_unverified` as success.

Do not use `set` or `subtract` as recharge operations. Do not recharge inactive users unless the user explicitly confirms the inactive status.

## Limits And Model Availability

Sub2API v0.1.168 does not provide a configurable per-model RPM limit.

- User RPM: `PUT /api/v1/admin/users/:id` with `rpm_limit`; use `sub2api-admin_update_user_limits` after exact email/ID verification.
- User concurrency: the same user route with `concurrency`. Existing requests retain acquired slots.
- Group RPM: update the group `rpm_limit`. A group limit applies per user in that group, not per model.
- User/group override: `PUT /api/v1/admin/groups/:id/rpm-overrides`; this endpoint is not exposed by this MCP. Use the admin UI until a dedicated, reviewed tool is added.
- `rate_multiplier` changes billing, not request rate.

For temporary model unavailability, call `sub2api-admin_model_control_options` first and identify the model's actual scheduling boundary:

- Dedicated account: set that account `schedulable=false` with `sub2api-admin_set_account_schedulable`. This disables every model on the account. Roll back with `schedulable=true`.
- Restricted channel: remove the exact model from the channel model/pricing list only while `restrict_models=true`; preserve the previous channel payload for rollback. This MCP does not mutate channels, so use the admin UI.
- Composite model: disable the exact composite route and preserve its prior state. This MCP does not mutate composite routes, so use the admin UI.
- Shared or passthrough account: do not remove a model mapping and assume it is blocked; fallback or passthrough can still serve it.
- `models_list_config` only changes discovery output. It does not block direct requests and must never be reported as a model disable.

Scheduling changes affect new requests only. They do not cancel requests or streams already in progress. If the model spans multiple accounts, channels, or routes, enumerate and confirm every affected target before mutation.

## Verification

After application-level changes:

1. Re-read the changed user, group, account, channel, or route through the admin API.
2. Check `/health` and relevant account availability or ops metrics.
3. For model availability changes, make an authenticated request to the exact model and verify the intended rejection or recovery without exposing the user API token.
4. For Kubernetes changes, verify ArgoCD health and rollout separately; do not patch Git-owned resources as a second ownership path.
5. Update the Sub2API runbook through `hugo-doc-maintainer` with commands, rollback, and verified behavior.
