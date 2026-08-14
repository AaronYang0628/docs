---
name: ingress-nginx-72602-operations
description: Use ONLY when operating the shared ingress-nginx controller, ingress class, NodePorts, routing, or TLS termination in the 72602 cluster.
---

# ingress-nginx 72602 Operations

Operate the shared ingress controller in namespace `basic-components`. It is
the common entry point for 72602 web services and must be treated as shared
infrastructure.

## Fixed scope

- ArgoCD Application: `ingress-nginx`.
- Ingress class: `nginx`.
- NodePorts: `32080` for HTTP and `32443` for HTTPS.
- TLS terminates at ingress-nginx; ECS HAProxy and the Web tunnels pass the web traffic through.
- Public DNS, certificates, and individual Ingress objects remain owned by their respective services.

## Routine path

1. Read the affected Ingress, Service, EndpointSlice, controller Service, and controller Pod health.
2. Test the route using the canonical HTTPS hostname and path; inspect redirects, TLS, backend status, and controller logs.
3. For an application route change, edit the application owner rather than the shared controller.
4. For controller configuration, change the Git/ArgoCD source and inspect rendered diffs before convergence.
5. Verify controller rollout, NodePorts, the affected backend endpoint, certificate readiness, and public HTTP response.

## Mutation and rollback

Before changing controller arguments, admission behavior, NodePorts, or shared
routing, state the exact target, current value, proposed value, blast radius,
and rollback. Use a reviewed Git revert. Do not change host firewall, ECS
HAProxy, WireGuard, or tunnels from this skill; load the owning skill instead.

Never expose TLS Secret contents or controller credentials.
