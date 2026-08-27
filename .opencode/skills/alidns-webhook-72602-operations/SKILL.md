---
name: alidns-webhook-72602-operations
description: Use ONLY when operating the AliDNS cert-manager webhook in 72602, including DNS01 solver failures and webhook health.
---

# AliDNS Webhook 72602 Operations

Operate the AliDNS webhook in the `cert-manager` namespace. It is supporting
the cert-manager Application and is not a standalone ArgoCD Application in
the 72602 service inventory.

## Fixed scope

- Namespace: `cert-manager`.
- Downstream owner: `cert-manager-72602-operations`.
- Cloud DNS mutations: `aliyun-72602-operations`.
- Ownership must be confirmed from live tracking/Helm metadata before a configuration mutation; do not assume a missing standalone Application is permission to patch it.

## Routine path

1. Read the webhook Deployment/Pod, Service/endpoints, referenced Secret names only, and the cert-manager Challenge/Order event that called it.
2. Separate webhook process health from AliDNS authentication, DNS propagation, and ACME validation.
3. Find the actual Git/Helm owner before changing the webhook.
4. Verify webhook readiness, solver invocation, DNS record behavior, and Certificate readiness.

Never print AccessKeys, Secret values, private keys, or ACME credentials.

## Mutation and rollback

Before changing webhook image, arguments, credentials, or DNS behavior, state
target, current value, proposed value, blast radius, and rollback. Use the
owning source and `aliyun-72602-operations` for rollback; do not delete valid
Certificates or TLS Secrets as a first response.
