+++
title = '☁️CSP Related'
date = 2024-03-07T15:00:59+08:00
weight = 32
+++

## Managed Network Topology

The two k3s clusters have different trust boundaries and service roles. `zjlab`
is the private company-network workload plane; `72602` is the public service
plane. `ecs-99` is the shared public relay and SSH jump host. The diagram shows
stable roles and paths, not a live health status.

```mermaid
%%{init: {"flowchart": {"curve": "basis", "nodeSpacing": 30, "rankSpacing": 45}}}%%
flowchart TB
    users["Public users"]
    operators["Operators"]

    subgraph relay["Aliyun ECS ecs-99 · public relay · 47.110.67.161"]
        direction LR
        web["HAProxy Web\n80 / 443"]
        mail["HAProxy Mail\n25 / 465 / 587 / 993"]
        sshPublic["72602 SSH\n10021 primary · 10022 backup"]
        sshPrivate["ZJLAB ProxyJump targets\n10023 primary · 10024 backup\nloopback only"]
        monitor["Tunnel monitors\nDingTalk alerts"]
    end

    subgraph servicePlane["72602-minipc · public k3s service plane"]
        direction LR
        ingress["ingress-nginx\n32080 / 32443"]
        mailu["Mailu\n25 / 465 / 587 / 993"]
        ssh72602["sshd\n22"]
    end

    subgraph privatePlane["zjlab-ubuntu · private k3s workload plane"]
        direction LR
        sshZJLAB["sshd\n22"]
        workloads["Private workloads\nand internal data"]
    end

    users -->|"HTTP(S)"| web
    users -->|"SMTP / IMAP"| mail
    operators -->|"source-restricted"| sshPublic
    operators -->|"ECS SSH 22 + ProxyJump"| sshPrivate
    web -->|"WireGuard UDP 51820"| ingress
    mail -->|"loopback backends over 10022"| mailu
    sshPublic -->|"reverse SSH tunnels"| ssh72602
    sshPrivate -->|"reverse SSH tunnels"| sshZJLAB
    sshZJLAB --> workloads
    monitor -.-> sshPublic
    monitor -.-> sshPrivate

    classDef private fill:#e9f5ee,stroke:#1f7a4d,color:#123b27;
    classDef public fill:#eaf2ff,stroke:#2f63a8,color:#142b4a;
    classDef relay fill:#fff4df,stroke:#b87916,color:#4d3208;
    classDef service fill:#f4efff,stroke:#7650a8,color:#2d1e4a;
    class sshZJLAB,workloads private;
    class ingress,mailu,ssh72602 public;
    class web,mail,sshPublic,sshPrivate,monitor relay;
    class users,operators service;
```

The data-path arrows point from the client-facing listener to the destination.
The reverse SSH sessions themselves are initiated outbound by `72602-minipc`
and `zjlab-ubuntu` toward ECS.

### SSH Alias Convention

Use the alias matching the machine where the command runs. `local` aliases are
direct paths from the matching host; `proxy` aliases use the approved ECS
forwarding path. These are SSH configuration aliases, not DNS names.

| Command runs on | ZJLAB | 72602 | ECS |
|---|---|---|---|
| `zjlab-ubuntu` | `zjlab-ubuntu-local` | `72602-minipc-proxy` | `ecs-99` |
| `72602-minipc` | `zjlab-ubuntu-proxy` | `72602-minipc-local` | `ecs-99` |

Validate an alias with `ssh -G` and an SSH connection. Do not use the old
unqualified names `zjlab`, `zjlab-backup`, or `minipc`, and do not test an SSH
alias with a DNS lookup.

### Stable Port Map

| ECS port | Destination or function | Exposure |
|---|---|---|
| `10021/tcp` | 72602 SSH primary reverse tunnel | Public, source-restricted |
| `10022/tcp` | 72602 SSH backup reverse tunnel; independent Mailu loopback forwards | Public, source-restricted |
| `10023/tcp` | ZJLAB SSH primary listener used through ECS ProxyJump | ECS loopback only |
| `10024/tcp` | ZJLAB SSH backup listener used through ECS ProxyJump | ECS loopback only |
| `51820/udp` | WireGuard Web transport between ECS and 72602 | Public, source-restricted |

The four SSH tunnel paths are monitored independently and notify through
DingTalk. A simultaneous `ssh_banner_failed` alert for ZJLAB `primary` and
`backup` should first trigger checks of the shared ECS SSH prerequisite and the
current ZJLAB egress-IP allowlist; it is not by itself evidence that the stable
port map changed. Never publish or add public security-group rules for
`10023/10024`.

{{%children depth="999" description="false" showhidden="true" %}}
