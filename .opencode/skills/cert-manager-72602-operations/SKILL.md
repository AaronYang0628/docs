---
name: cert-manager-72602-operations
description: Use ONLY when operating cert-manager, Certificates, ACME orders, challenges, or ClusterIssuers in the 72602 cluster.
---

# cert-manager 72602 Operations

Operate cert-manager in namespace `basic-components`. It issues TLS for the
cluster; the `lets-encrypt` ClusterIssuer and DNS provider integration are
shared infrastructure, not application-owned resources.

## Fixed scope

- ArgoCD Application: `cert-manager`.
- Workloads: cert-manager controller, cainjector, and webhook.
- Ingress class using the certificates: `nginx`.
- DNS webhook support: `alidns-webhook-72602-operations`.

## Routine path

1. Read the target Certificate, CertificateRequest, Order, Challenge, and referenced Issuer/ClusterIssuer.
2. Check controller/webhook readiness and recent events before changing anything.
3. For a normal renewal, diagnose the exact failing object and DNS/TLS path; do not delete healthy Secrets or force a new order.
4. For configuration changes, update the owning Git/ArgoCD source and let ArgoCD converge.
5. Verify the Certificate condition, Secret presence by name only, ingress TLS handshake, and the public endpoint.

Use `aliyun-72602-operations` for AliDNS changes. Never print DNS credentials,
private keys, or TLS Secret values.

## Mutation and rollback

Before changing an Issuer, webhook, DNS record, or certificate resource,
state the target, current value, proposed value, blast radius, and rollback.
Rollback source configuration through Git. Preserve existing valid TLS until
the replacement Certificate is Ready; do not delete a PVC, Secret, or
Certificate as a routine recovery step.
