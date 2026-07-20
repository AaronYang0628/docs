---
name: aliyun-72602-operations
description: Use when operating Alibaba Cloud or Aliyun resources for 72602, including AliDNS records, ECS security groups, certificates after DNS changes, and the update-sg-ip timer. Run cloud mutations from 72602-minipc and protect the existing AccessKey.
---

# Aliyun Operations From 72602

Use `72602-minipc` as the execution boundary for Alibaba Cloud operations owned by the 72602 environment. Delegate live work to the `72602-k3s-maintainer` agent. Do not run mutations from the OpenCode Pod, ZJLAB, or an arbitrary workstation.

## Operational Sources

- Aliyun credentials: `/home/aaron/.aliyun-keys`, owned by `aaron`, mode `0600`.
- AliDNS SDK environment: `/home/aaron/.local/venvs/alidns`.
- Security-group updater: `/home/aaron/bin/update-sg-ip.sh`.
- systemd service: `/etc/systemd/system/update-sg-ip.service`.
- systemd timer: `/etc/systemd/system/update-sg-ip.timer`.
- Sanitized backup repository: `/home/aaron/Ops/ops-private`.
- 72602 download proxy: `http://192.168.0.25:17890`.

Treat live Alibaba APIs and live systemd state as authoritative. The public handbook and private backup are recovery references, not proof of current cloud state.

## Credential Rules

1. Source the credential file only inside the process that invokes the official SDK or the existing updater.
2. Never print, return, log, copy, commit, or move AccessKey values or the DingTalk token.
3. Do not pass credentials on a command line where they can appear in process listings or shell history.
4. Report only the credential source path, file ownership/mode, API action, resource identifiers needed for rollback, and sanitized API errors.
5. Never commit `/home/aaron/.aliyun-keys`. Backups must use placeholders or environment-variable references.
6. The current key has both ECS security-group and AliDNS mutation access. Preserve it until separate least-privilege RAM identities are available; do not silently broaden its permissions.

## AliDNS Workflow

For record creation or changes:

1. Confirm the zone, RR, type, value, TTL, and intended rollback before mutation.
2. Use the official Alibaba Cloud SDK from the existing AliDNS virtual environment.
3. Call `DescribeDomains` or `DescribeDomainRecords` first.
4. Be idempotent:
   - preserve an equivalent enabled record;
   - update the matching RR/type record when its value is wrong;
   - create only when no matching record exists;
   - never alter unrelated records.
5. Use TTL `600` unless the user or existing zone convention requires another value.
6. Verify through the AliDNS API, both authoritative nameservers, and at least two public resolvers.
7. When the record backs a Kubernetes Ingress, wait for normal cert-manager reconciliation. Inspect Certificate, Order, and Challenge once; do not repeatedly delete or force issuance.
8. Verify the final endpoint with normal DNS and strict TLS validation. For realtime services, also verify the WebSocket upgrade.
9. Return record ID, RR/type/value/TTL, resolver results, certificate issuer/expiry, endpoint status, and an exact rollback action without credentials.

## ECS Security-Group Workflow

Prefer the existing updater over ad hoc SDK mutations for the managed SSH and tunnel rules.

1. Inspect the timer and latest service result.
2. Validate the script with `bash -n` and units with `systemd-analyze verify` before changing them.
3. Confirm the current public IP and existing updater-owned rules before starting the service.
4. Trigger the oneshot service through systemd when a refresh is required, then inspect its journal and the ECS API result.
5. Preserve unrelated rules. Never open a broader CIDR or additional port without an explicit requirement.
6. Keep rollback data for every direct rule mutation.

The live script has known hardening debt: it is mode `0775`, contains non-secret deployment identifiers, contains a DingTalk token assignment, and captures the result after writing its cache rather than immediately after the SDK update. Use the sanitized private backup as the target for correcting these issues before replacing the live copy.

## Change And Documentation Flow

- Cloud state changes happen from 72602-minipc.
- GitOps-managed Kubernetes changes happen in the public docs repository and deploy through ArgoCD.
- Scripts, units, private identifiers, and environment templates belong in `/home/aaron/Ops/ops-private`.
- After verified operations, update the relevant Hugo runbook through `hugo-doc-maintainer`; never add chronological incident logs or secrets.
- Before a Git commit, inspect status, diff, and recent history. Commit only intended files and push only when authorized by the task.

## Completion Evidence

Do not report success from an SDK response alone. Require:

- API state matches the requested state;
- authoritative and public observations agree where applicable;
- dependent certificates and endpoints are healthy;
- no unrelated cloud resource changed;
- rollback identifiers are recorded;
- any remaining security debt or external blocker is explicit.
