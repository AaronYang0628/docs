---
name: postgresql-72602-operations
description: Use ONLY when operating the shared PostgreSQL instance in the 72602 cluster, including database backups, users, storage, and consumer compatibility.
---

# PostgreSQL 72602 Operations

Operate PostgreSQL StatefulSet `postgresql` in namespace `database`. This is
an intentionally shared database service. Application databases and users are
separate tenants inside the same instance.

## Fixed 72602 facts

- ArgoCD Application: `postgresql`.
- Namespace: `database`.
- The instance is shared by at least n8n and Sub2API.
- Sub2API uses its own `sub2api` database/user. Its external connection is not expected to use the PostgreSQL initialization identity.
- Do not report PostgreSQL initialization values mentioning n8n as a Sub2API misconfiguration; inspect the named database/user only when a real connection or schema failure exists.
- Storage is cluster-local and stateful. PVC deletion is never a rollback step.

## Routine path

1. Read StatefulSet/Pod readiness, PVC/PV binding, Service endpoints, recent events, and logs without reading Secret values.
2. For an application incident, identify the exact database and user from the consumer's documented connection; do not inspect unrelated databases.
3. For schema-changing consumer upgrades, take one scoped dump of the target database and verify its catalog before the upgrade.
4. Check readiness and connection behavior after any approved change.

## Backup and restore

Use a controlled `pg_dump`/`pg_restore` path from the approved runbook. Keep
passwords in Secret references or process-local environment only. Never print
passwords, connection strings containing credentials, or all-database dumps.
For an uncertain stream, validate the dump inside the PostgreSQL container
instead of repeatedly streaming it through `kubectl exec -i`.

## Mutation and rollback

Before changing PostgreSQL configuration, users, databases, storage, or
restoring data, state the exact target, current value, proposed value, blast
radius, and rollback; obtain confirmation for destructive or credential
operations. Roll back Git-owned configuration with Git. A database restore is
an explicit data operation, not a pod rollback, and must target an isolated
database first when forward migrations may have run.
