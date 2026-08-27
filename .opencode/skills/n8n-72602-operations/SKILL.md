---
name: n8n-72602-operations
description: Use ONLY when operating n8n in the 72602 cluster, including its web, worker, webhook, MCP webhook, Redis, database, and public routes.
---

# n8n 72602 Operations

Operate the n8n Application in namespace `n8n`. n8n is a multi-workload
application: main, worker, webhook, MCP webhook, and its Redis must be checked
as one service while preserving each workload's ownership.

## Fixed scope

- ArgoCD Application: `n8n`.
- Namespace: `n8n`.
- Public hosts: `n8n.72602.space` and `webhook.n8n.72602.space`.
- PostgreSQL is the shared 72602 instance; use n8n's documented database/user and do not confuse it with Sub2API's `sub2api` database/user.

## Routine path

1. Read Application status, all n8n Deployments/Pods, Services/EndpointSlices, Redis, and the public web/webhook routes.
2. Check the exact failing workflow or webhook path and recent logs; avoid dumping workflow credentials or execution payloads.
3. For GitOps changes, edit the n8n source and inspect the rendered diff. Do not patch live child workloads.
4. Verify main, worker, webhook, MCP webhook, Redis, database connectivity, and both public routes after convergence.

## Mutation and rollback

Before changing workflow data, credentials, database schema, queue settings,
or deployment configuration, state target, current value, proposed value,
blast radius, and rollback. Use Git for manifests and a verified data backup
for workflow/database rollback. Never print credentials, OAuth tokens, or
execution secrets.
