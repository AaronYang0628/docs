---
name: zjlab-mihomo-operations
description: Use ONLY when checking or operating the local Mihomo/Clash proxy on zjlab-ubuntu, including its loopback listener, HTTP CONNECT behavior, service health, and client reachability.
---

# ZJLAB Mihomo Operations

Operate the Mihomo process local to `zjlab-ubuntu`. Keep it distinct from the
ECS proxy at `47.110.67.161:7890` and the 72602 proxy on `72602-minipc`.

## Routine read path

1. Confirm `hostname` before attributing a loopback address; `127.0.0.1` is
   local to the caller's network namespace.
2. Read the listener and owning process for TCP `7890`, then identify its
   actual system or user service before querying service status or logs. Do not
   assume the ECS unit name or configuration path applies here.
3. Test the proxy with an explicit HTTP proxy request, for example
   `curl --proxy http://127.0.0.1:7890 http://example.com`. Test HTTPS
   separately because it requires a working CONNECT tunnel.
4. If HTTP works but HTTPS times out, inspect recent service status and logs
   without printing command arguments, configuration contents, credentials,
   subscription URLs, or response bodies.
5. Report listener health separately from HTTP forwarding and HTTPS CONNECT
   health. A successful TCP connection alone does not establish proxy egress.

## Network scope

- A listener bound only to `127.0.0.1:7890` is available only in the same
  network namespace. Containers and other machines have their own loopback.
- For an ECS proxy request from ZJLAB, use the documented ECS address and
  provide its proxy credentials through the consuming client's secret store.
  An unauthenticated HTTP `407` confirms reachability but not proxy egress.
- Do not change listener binding or firewall exposure to solve a client
  namespace mismatch without first establishing the intended client network.

## Mutation and rollback

Before changing listener binding, authentication, routing, or the owning
service, state the current value, proposed value, affected clients, blast radius,
and rollback. Preserve configuration privately, use the discovered owner for
changes, and verify both HTTP and HTTPS proxy requests afterward. Never print
proxy credentials, provider keys, subscription URLs, or full proxy
configuration.
