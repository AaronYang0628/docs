+++
title = "Shared Clash/Mihomo Operations"
weight = 2
+++

`zjlab-ubuntu` and `72602-minipc` both use
[`nelvko/clash-for-linux-install`](https://github.com/nelvko/clash-for-linux-install)
from `/home/aaron/clashctl`. This page is the shared host-level proxy runbook;
cluster-specific bridges and application proxy variables remain documented on
their respective cluster pages.

## Command Loading

`clashctl` is a Bash function loaded by `/home/aaron/.bashrc`, not an executable
installed in `PATH`. Non-interactive SSH and agent shells do not automatically
load it, so `command -v clashctl` or a direct `clashctl status` can incorrectly
report that the command is missing.

Prefer explicit loading in automation:

```bash
CLASH_HOME=/home/aaron/clashctl
. "$CLASH_HOME/scripts/cmd/clashctl.sh"
clashctl --help
"$CLASH_HOME/bin/mihomo" -v
clashctl status
```

`bash -ic 'clashctl status'` is acceptable for a quick remote check, but it can
emit harmless job-control warnings when SSH has no TTY. Explicit sourcing gives
cleaner, more predictable automation output.

## Read-Only Preflight

Run this once on the target host before trying alternate ports, editing proxy
variables, or restarting anything:

```bash
CLASH_HOME=/home/aaron/clashctl
. "$CLASH_HOME/scripts/cmd/clashctl.sh"

hostname
"$CLASH_HOME/bin/mihomo" -v
clashctl status

proxy_port="$("$CLASH_HOME/bin/yq" \
  '."mixed-port" // .port // 7890' \
  "$CLASH_HOME/resources/runtime.yaml")"
printf 'proxy_port=%s\n' "$proxy_port"

curl --proxy "http://127.0.0.1:${proxy_port}" \
  --connect-timeout 5 --max-time 12 \
  --silent --show-error --output /dev/null \
  --write-out 'proxy_http_code=%{http_code}\n' \
  https://www.gstatic.com/generate_204
```

The expected result is one active mihomo process and HTTP `204`. This test uses
the configured local port and proves an end-to-end HTTPS request through the
proxy; it is more useful than probing a sequence of guessed ports.

If it fails, inspect the existing log without opening an interactive pager:

```bash
tail -n 100 /home/aaron/clashctl/resources/mihomo.log
```

Do not use `clashctl log` in unattended work because it invokes `less`.

## Three Independent States

Do not collapse these into one "proxy is enabled" judgment:

1. `clashctl status` checks whether the mihomo core process exists.
2. `._custom.system-proxy.enable` is only the saved proxy preference in
   `mixin.yaml`.
3. `HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY`, and `NO_PROXY` are environment
   variables inherited by the current shell or process.

Inspect the latter two without printing proxy URLs or authentication:

```bash
CLASH_HOME=/home/aaron/clashctl

"$CLASH_HOME/bin/yq" -r \
  '"saved_proxy_flag=" + ((._custom.system-proxy.enable // false) | tostring)' \
  "$CLASH_HOME/resources/mixin.yaml"

env | awk -F= \
  'BEGIN { IGNORECASE=1 } /^(http|https|all|no)_proxy=/{ print $1 }' | \
  sort -fu
```

It is valid for the core and explicit `curl --proxy` request to be healthy while
a fresh non-interactive shell has no proxy variables. Do not call
`clashctl proxy on` merely to make a diagnostic shell look enabled; that command
changes saved state. Use an explicit per-command proxy unless the requested
operation requires persistent shell proxy configuration.

## Systemd Boundary

`clashctl` has no version subcommand. Query the installed core directly:

```bash
/home/aaron/clashctl/bin/mihomo -v
```

Do not use a systemd unit state as a substitute for `clashctl status` and the
end-to-end request. ZJLAB currently has no `clashctl-on.service`. On 72602,
`clashctl-on.service` is an enabled user-level `Type=oneshot` bootstrap;
`active (exited)` means only that the bootstrap command completed. It does not
supervise or prove the health of the current mihomo process.

## Path Boundaries

- Host-local tools on both machines use `127.0.0.1:<runtime-port>`.
- On 72602, Pods use `http://192.168.0.25:17890` or
  `http://argocd-egress-proxy.argocd.svc.cluster.local:17890`. The socat bridge
  forwards to host-local mihomo.
- Do not configure a 72602 Pod with `192.168.0.25:7890` while `allow-lan` is
  false.
- The 72602 bridge is not evidence that the same Pod path exists in ZJLAB.
  Verify the target cluster's live proxy path separately.

## Command Safety

| Command | Behavior | Agent policy |
|---|---|---|
| `clashctl --help` | Shows locally installed command set | Read-only |
| `/home/aaron/clashctl/bin/mihomo -v` | Shows the installed core version | Read-only |
| `clashctl status` | Checks the mihomo process | Read-only; first diagnostic |
| `clashctl log` | Opens `less` on the core log | Avoid in automation; use `tail` |
| `clashctl proxy` | Shows proxy environment state | Do not capture raw output; it may include authentication |
| `clashctl on` / `off` | Starts or force-stops the shared core and changes shell proxy state | Requires explicit authorization |
| `clashctl ui` | Shows the panel and starts the core if it is down | Not read-only; requires authorization |
| `clashctl proxy on` / `off` | Changes saved proxy state and current shell variables | Requires authorization |
| `clashctl tun` | Reads or changes host routing/TUN state | Changes require explicit authorization |
| `clashctl mixin` | Reads or edits merged configuration and can restart the core | Do not print full config; changes require authorization |
| `clashctl sub` | Manages subscription sources and updates | URLs are sensitive; changes require authorization |
| `clashctl upgrade` | Upgrades the running core | Requires reviewed maintenance window |
| `clashctl secret` | Reads or changes the controller secret | Never print; changes require secure rotation approval |

Do not stop or restart the proxy merely because an unrelated external endpoint
is slow. Confirm core status, the configured port, one known `generate_204`
request, and the recent log first.

## 2026-08-14 Audit Snapshot

Read-only checks on both `zjlab-ubuntu` and `72602-minipc` found:

- the installed mihomo process active;
- Mihomo Meta `v1.19.17` on `linux amd64`;
- HTTP/mixed port `7890`, SOCKS port `7891`, and controller port `9090`;
- `allow-lan: false` and TUN disabled;
- the dynamic local-port preflight above returned HTTP `204` on each host.

ZJLAB had no `clashctl-on.service`. The 72602 user unit was enabled and
`active (exited)`, but was a `Type=oneshot` bootstrap rather than the supervisor
of the live core. Fresh non-interactive shells did not inherit proxy environment
variables, which did not prevent the explicit local proxy checks from passing.

Treat these as dated health observations. The runtime configuration remains
authoritative for current ports and modes.
