---
description: Grant a one-hour temporary IPv4 ECS access lease with /pass <ip>.
agent: build
---

Handle the `/pass <ip>` command as a live security-group mutation.

The only valid input is exactly one IPv4 address in `$ARGUMENTS`. Reject empty,
multiple, CIDR, hostname, IPv6, or otherwise invalid input. Do not infer an IP
from the Web request, forwarded headers, conversation history, or a tool host.

Delegate the live operation to the `72602-k3s-maintainer` subagent. It must load
`aliyun-72602-operations` and run the installed temporary-access script from the
approved `72602-minipc` execution boundary. The approved connection path from
the Ops Agent Pod is the `minipc` SSH alias:

```text
ssh minipc /home/aaron/bin/temporary-ecs-access.sh grant <validated-ip>
```

The script grants the IPv4 `/32` for exactly one hour to the ECS security group
for TCP `22`, `10021`, `10022` and UDP `51820`. It must preserve all unrelated
rules, use its own description/lease ID, verify the resulting ECS API state,
and leave the lease for the independent expiry timer. A repeated request for
the same active IP must report the existing expiry and must not extend it.

Do not add TCP `10023`, `10024`, `3128`, or `56396`. Do not mutate ECS UFW,
WireGuard, SSH, HAProxy, DNS, or Kubernetes as part of this command. Never
print credentials, API keys, lease secrets, or unrelated security-group rules.

Report only the validated source IP, granted protocols/ports, lease ID,
expiration time, verification result, and any sanitized failure/rollback state.
