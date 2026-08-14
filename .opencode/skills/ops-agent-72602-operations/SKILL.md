---
name: ops-agent-72602-operations
description: Use ONLY when operating the managed Ops Agent in the 72602 cluster, including startup configuration, skills, agents, plugins, health, and rollout.
---

# Ops Agent 72602 Operations

Operate the `application/ops-agent` Deployment. This is the managed runtime
for the operations assistant, so startup configuration changes have a
controlled cluster rollout requirement.

## Fixed scope

- ArgoCD Application: `ops-agent`.
- Namespace: `application`.
- Startup-loaded files include `opencode.json`, `.opencode/agents/`, `.opencode/skills/`, plugins, and MCP configuration.
- The managed workload, not a user's local process, must be restarted after startup configuration changes.

## Routine path

1. Read the live Deployment, Pod readiness/restarts, ArgoCD health, and the changed file diff.
2. Validate configuration and skill frontmatter before any rollout.
3. After a startup configuration change, run:

   ```sh
   kubectl -n application rollout restart deployment/ops-agent
   kubectl -n application rollout status deployment/ops-agent --timeout=300s
   ```

4. Verify `GET /global/health` reports `healthy: true` and confirm the live merged configuration contains the intended skill/agent entries.

Ordinary documentation, manifests, or application source changes that are not
loaded at agent startup do not require this rollout.

## Mutation and rollback

Before changing a startup file, state target, current value, proposed value,
blast radius, and rollback. Validate the exact file, use Git rollback for
source changes, and never expose provider keys, MCP credentials, or Secret
values. Do not tell the user to restart a local OpenCode process for managed
workload changes.
