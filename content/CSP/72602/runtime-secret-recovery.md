+++
title = "Runtime Secret Recovery"
weight = 4
+++

This runbook recovers a small, approved whitelist of missing runtime Secrets
from a pre-incident k3s etcd snapshot. It does not restore the production
cluster, databases, PVC contents, or application data.

## Safety boundary

{{% notice style="warning" title="Never reset production" %}}
Never run `k3s server --cluster-reset` with the production data directory,
service, ports, network namespace, or kubeconfig. Restore the snapshot only in
an isolated, same-version temporary k3s environment with no physical network
interface or external route.
{{% /notice %}}

- Obtain explicit approval to read the snapshot and create the named production
  Secrets.
- Stop before production writes if the snapshot, version, token, isolation, or
  target object state is uncertain.
- Disable shell tracing. Do not print Secret JSON/YAML, base64 data, hashes,
  tokens, passwords, private keys, or connection strings.
- Use a root-owned mode-`0700` temporary directory and mode-`0600` files. Do not
  use the repository or an ordinary shared `/tmp` directory.
- Use `kubectl create`, not `apply`, `replace`, or patch. A concurrent object
  creation must fail instead of being overwritten.
- Do not delete Pods to accelerate recovery. Let kubelet and controllers retry
  the existing Pods after the required Secrets exist.
- Do not modify PVCs, restore PostgreSQL, copy Redis data, or include filing-site
  resources in this procedure.
- Run the production write steps only from `72602-minipc` with kubeconfig
  context `default`. Recheck both immediately before creation; do not rely on
  an earlier terminal prompt or context check.

The approved 2026-08-02 whitelist was:

```text
aliyun-registry
opencode-model
opencode-basic-auth
opencode-argocd
opencode-ssh
opencode-git-credentials
sub2api-auth
sub2api-external-postgresql
sub2api-redis
```

`filing-site-upload-auth` and `72602.space-tls` were explicitly excluded.

## Preflight

Confirm the live identity and exact k3s version before reading the snapshot:

```bash
hostname
kubectl config current-context
kubectl get nodes -o wide
kubectl version
sudo k3s etcd-snapshot ls --output json
sudo k3s secrets-encrypt status
```

Set the approved snapshot and whitelist without adding credential values to the
shell history:

```bash
set +x
set -o pipefail
SNAPSHOT="/var/lib/rancher/k3s/server/db/snapshots/<approved-snapshot>"
NAMESPACE=application
NAMES=(
  aliyun-registry
  opencode-model
  opencode-basic-auth
  opencode-argocd
  opencode-ssh
  opencode-git-credentials
  sub2api-auth
  sub2api-external-postgresql
  sub2api-redis
)
sudo test -r "$SNAPSHOT"
```

Perform the first production absence check. If any object is present, stop the
batch before extraction or writing and determine whether a newer value has
already been created:

```bash
for name in "${NAMES[@]}"; do
  found="$(kubectl -n "$NAMESPACE" get secret "$name" \
    --ignore-not-found -o name)"
  test -z "$found" || {
    printf '%s already exists; stop before write\n' "$name" >&2
    exit 1
  }
done
```

Record the affected workloads, storage, route, and certificate state without
reading Secret values:

```bash
kubectl -n application get deploy,statefulset,pod,pvc -o wide
kubectl -n application get ingress,certificate -o wide
kubectl -n application get events --sort-by=.lastTimestamp
```

## Isolated extraction

Use the installed k3s binary so the temporary server exactly matches the live
version. The temporary network has only loopback and a dummy sink interface.
The dummy default route satisfies k3s node-address discovery, but cannot send a
packet through a host or physical interface.

Create the protected operation directory:

```bash
RECOVERY_ROOT="$(sudo mktemp -d -p /var/lib \
  k3s-secret-recovery.XXXXXXXX)"
sudo chmod 0700 "$RECOVERY_ROOT"
printf 'recovery directory created with mode 0700\n'
```

Run the reset and export inside one private mount, network, and PID namespace.
The production k3s and configuration directories are remounted read-only only
inside that private mount namespace. The production server token is required to
decrypt the snapshot bootstrap data; copy it only to
`${RECOVERY_ROOT}/data/server/token` with mode `0600` and never print it.

```bash
sudo tee "$RECOVERY_ROOT/extract.sh" >/dev/null <<'RECOVERY_SCRIPT'
#!/usr/bin/env bash
set -euo pipefail
set +x
umask 077
REC="$RECOVERY_ROOT"
PROD=/var/lib/rancher/k3s

case "$REC" in
  /var/lib/k3s-secret-recovery.*) ;;
  *) exit 20 ;;
esac
test -r "$SNAPSHOT"

mount --make-rprivate /
mount --bind "$PROD" "$PROD"
mount -o remount,bind,ro "$PROD"
if test -d /etc/rancher/k3s; then
  mount --bind /etc/rancher/k3s /etc/rancher/k3s
  mount -o remount,bind,ro /etc/rancher/k3s
fi

ip link set lo up
ip link add recovery0 type dummy
ip addr add 198.18.0.1/32 dev recovery0
ip link set recovery0 up
ip route add default dev recovery0
test "$(ip -o link show | wc -l)" -eq 2
test "$(ip route show default dev recovery0 | wc -l)" -eq 1

install -d -m 0700 "$REC/data/server" "$REC/export"
install -m 0600 "$PROD/server/token" "$REC/data/server/token"

common=(
  server
  --config /dev/null
  --data-dir "$REC/data"
  --token-file "$REC/data/server/token"
  --node-name secret-recovery
  --node-ip 198.18.0.1
  --bind-address 127.0.0.1
  --advertise-address 127.0.0.1
  --https-listen-port 16443
  --lb-server-port 16444
  --write-kubeconfig "$REC/recovery.kubeconfig"
  --write-kubeconfig-mode 0600
  --disable-agent
  --flannel-backend none
  --egress-selector-mode disabled
  --disable coredns
  --disable servicelb
  --disable traefik
  --disable local-storage
  --disable metrics-server
  --disable-scheduler
  --disable-cloud-controller
  --disable-kube-proxy
  --disable-network-policy
  --disable-helm-controller
  --etcd-disable-snapshots
)

/usr/local/bin/k3s "${common[@]}" \
  --cluster-reset \
  --cluster-reset-restore-path "$SNAPSHOT" \
  >"$REC/restore.log" 2>&1

/usr/local/bin/k3s "${common[@]}" >"$REC/server.log" 2>&1 &
server_pid=$!
cleanup_server() {
  kill -TERM "$server_pid" >/dev/null 2>&1 || true
  wait "$server_pid" >/dev/null 2>&1 || true
}
trap cleanup_server EXIT

ready=0
for _ in $(seq 1 180); do
  kill -0 "$server_pid" >/dev/null 2>&1 || exit 21
  if /usr/local/bin/k3s kubectl \
    --kubeconfig "$REC/recovery.kubeconfig" \
    get --raw=/readyz >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done
test "$ready" -eq 1

names=(
  aliyun-registry
  opencode-model
  opencode-basic-auth
  opencode-argocd
  opencode-ssh
  opencode-git-credentials
  sub2api-auth
  sub2api-external-postgresql
  sub2api-redis
)

for name in "${names[@]}"; do
  /usr/local/bin/k3s kubectl \
    --kubeconfig "$REC/recovery.kubeconfig" \
    -n application get secret "$name" -o json | \
    jq -ce --arg name "$name" '
      select(
        .apiVersion == "v1" and
        .kind == "Secret" and
        .metadata.namespace == "application" and
        .metadata.name == $name and
        (.data | type == "object") and
        (.data | length > 0)
      ) |
      {
        apiVersion: "v1",
        kind: "Secret",
        metadata: {
          name: .metadata.name,
          namespace: "application"
        },
        type: .type,
        data: .data
      } +
      (if has("immutable") then {immutable: .immutable} else {} end)
    ' >"$REC/export/$name.json"
  chmod 0600 "$REC/export/$name.json"
done

test "$(printf "%s\n" "$REC"/export/*.json | wc -l)" -eq 9
printf 'isolated whitelist export complete: 9 objects\n'
RECOVERY_SCRIPT

sudo chmod 0700 "$RECOVERY_ROOT/extract.sh"
sudo env -i \
  PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
  HOME=/root \
  RECOVERY_ROOT="$RECOVERY_ROOT" \
  SNAPSHOT="$SNAPSHOT" \
  unshare --mount --net --pid --fork --mount-proc \
  "$RECOVERY_ROOT/extract.sh"
```

Do not continue if the reset or temporary API fails. Inspect only redacted error
lines from the root-owned logs; do not dump those logs or exported objects to a
terminal. A missing default route must be solved only with the isolated dummy
sink above. A restore requires the token at the temporary data-directory path;
never satisfy that requirement by changing the production data directory.

## Create production objects

Before the first mutation, record this rollback: delete only the objects that
this operation successfully creates and that were proven absent immediately
before creation. Never include a PVC, database, TLS Secret, or filing-site
resource in that rollback.

Repeat the absence check immediately before creation:

```bash
test "$(hostname)" = 72602-minipc || {
  printf 'wrong host; abort before production write\n' >&2
  exit 1
}
test "$(kubectl config current-context)" = default || {
  printf 'wrong kubeconfig context; abort before production write\n' >&2
  exit 1
}
test "$NAMESPACE" = application || {
  printf 'wrong target namespace; abort before production write\n' >&2
  exit 1
}
kubectl get node 72602-minipc -o name | grep -qx 'node/72602-minipc'

for name in "${NAMES[@]}"; do
  found="$(kubectl -n "$NAMESPACE" get secret "$name" \
    --ignore-not-found -o name)"
  test -z "$found" || {
    printf '%s appeared after preflight; abort the batch\n' "$name" >&2
    exit 1
  }
done
```

Create each object through a protected pipe. `kubectl create` provides the
required no-overwrite behavior:

```bash
CREATED=()
CREATE_FAILED=
for name in "${NAMES[@]}"; do
  if sudo dd if="$RECOVERY_ROOT/export/$name.json" status=none | \
    kubectl create -f - >/dev/null; then
    CREATED+=("$name")
    printf '%s created\n' "$name"
  else
    printf '%s failed; stop and assess\n' "$name" >&2
    CREATE_FAILED="$name"
    break
  fi
done

if test -n "$CREATE_FAILED"; then
  printf 'created before failure:' >&2
  printf ' %s' "${CREATED[@]}" >&2
  printf '\n' >&2
  false
fi
```

Do not automatically roll back a healthy recovery. If rollback is explicitly
approved, use the same shell and delete only the names captured in `CREATED`.
If that shell state is unavailable, stop and reconstruct the list from the
recorded create results and Secret metadata before requesting new approval:

```bash
if test "${#CREATED[@]}" -eq 0; then
  printf 'CREATED is empty; refuse rollback\n' >&2
  false
else
  kubectl -n "$NAMESPACE" delete secret "${CREATED[@]}"
fi
```

## Verification

Verify object metadata without requesting `.data` or `.stringData`:

```bash
for name in "${NAMES[@]}"; do
  kubectl -n application get secret "$name" \
    -o custom-columns='NAME:.metadata.name,TYPE:.type,CREATED:.metadata.creationTimestamp' \
    --no-headers
done
```

Wait for the existing workloads and endpoints. A Deployment can briefly retain
the incident's old `ProgressDeadlineExceeded` condition before its Pod becomes
Ready; verify the current replicas and repeat `rollout status` after the
controller updates the condition.

```bash
kubectl -n application rollout status \
  statefulset/sub2api-redis-master --timeout=300s
kubectl -n application rollout status deployment/sub2api --timeout=300s
kubectl -n application rollout status deployment/ops-agent --timeout=300s
kubectl -n application get deploy,statefulset,pod -o wide
kubectl -n application get endpointslice \
  -l kubernetes.io/service-name=sub2api -o wide
kubectl -n application get endpointslice \
  -l kubernetes.io/service-name=ops-agent -o wide
```

Inspect logs only after applying a credential and connection-string redactor.
Treat any unrecognized output format as unsafe and stop before printing it.
Verify that restart counts remain unchanged during an observation window.

Use the credential already injected into the Ops Agent Pod to verify health
without reading it into terminal output or a command argument:

```bash
kubectl -n application exec deployment/ops-agent -c ops-agent -- sh -ceu '
set +x
{
  printf "user = \"%s:%s\"\n" \
    "$OPENCODE_SERVER_USERNAME" "$OPENCODE_SERVER_PASSWORD"
  printf "url = \"http://127.0.0.1:4000/global/health\"\n"
} | curl --silent --show-error --fail --config - | \
  jq -e ".healthy == true" >/dev/null
printf "ops-agent health is healthy\n"
'
```

Verify public routing, DNS, and TLS:

```bash
getent ahostsv4 ops.agent.72602.space
getent ahostsv4 sub2api.72602.space
kubectl -n application get ingress ops-agent sub2api -o wide
kubectl -n application get certificate \
  ops.agent.72602.space-tls sub2api.72602.space-tls
curl -fsS -o /dev/null -w '%{http_code}\n' \
  https://sub2api.72602.space/health
curl -fsS -o /dev/null -w '%{http_code}\n' \
  https://sub2api.72602.space/api/v1/settings/public
curl -sS -o /dev/null -w '%{http_code}\n' \
  https://ops.agent.72602.space/
```

Run ArgoCD read-only checks from the Ops Agent Pod, where `ARGOCD_SERVER` and
the readonly `ARGOCD_AUTH_TOKEN` are injected:

```bash
kubectl -n application exec -i deployment/ops-agent -c ops-agent -- \
  sh -seu <<'ARGOCD_CHECK'
for app in ops-docs ops-agent sub2api; do
  argocd app get "$app" --hard-refresh --insecure --grpc-web -o json | \
    jq -r '[
      .metadata.name,
      .status.sync.status,
      .status.health.status,
      (.status.sync.revision // "")
    ] | @tsv'
done
ARGOCD_CHECK
```

## Cleanup

After the production create has completed or the operation has stopped before
write, remove the entire temporary directory. First prove that no process or
listener still uses it, then validate the path before deletion:

```bash
RECOVERY_CANON="$(sudo realpath -e -- "$RECOVERY_ROOT")" || {
  printf 'cannot resolve recovery path; refuse cleanup\n' >&2
  exit 1
}
test "$RECOVERY_CANON" = "$RECOVERY_ROOT" || {
  printf 'recovery path is not canonical; refuse cleanup\n' >&2
  exit 1
}
test "$(dirname -- "$RECOVERY_CANON")" = /var/lib || {
  printf 'unexpected recovery parent; refuse cleanup\n' >&2
  exit 1
}
case "$(basename -- "$RECOVERY_CANON")" in
  k3s-secret-recovery.????????) ;;
  *) printf 'unexpected recovery path; refuse cleanup\n' >&2; exit 1 ;;
esac
test "$(sudo stat -c '%u:%a' -- "$RECOVERY_CANON")" = 0:700 || {
  printf 'unexpected recovery owner or mode; refuse cleanup\n' >&2
  exit 1
}

if ps -eo args= | grep -F "$RECOVERY_ROOT" | grep -v grep >/dev/null; then
  printf 'temporary process still present; stop before cleanup\n' >&2
  exit 1
fi

TEMP_LISTENERS="$(sudo ss -H -lntp \
  '( sport = :16443 or sport = :16444 )')" || exit 1
test -z "$TEMP_LISTENERS" || {
  printf 'temporary listener still present; stop before cleanup\n' >&2
  exit 1
}
if ip link show recovery0 >/dev/null 2>&1; then
  printf 'temporary link still present; stop before cleanup\n' >&2
  exit 1
fi

sudo rm -r -- "$RECOVERY_CANON"
sudo test ! -e "$RECOVERY_CANON"
test "$(kubectl get --raw=/readyz)" = ok
```

The listener and link gates must both pass before deletion. The private
namespace exit normally removes them automatically. Keep the approved etcd
snapshot in the normal k3s snapshot directory; cleanup removes only the
isolated restore environment and exported Secret material.

## 2026-08-02 recovery record

- Live identity was `72602-minipc`, context `default`, node
  `72602-minipc` Ready at `192.168.0.25`, k3s `v1.34.6+k3s1`.
- Snapshot `etcd-snapshot-72602-minipc-1785600004` was
  `readyToUse=true`, size `20164640`, created at
  `2026-08-01T16:00:04Z`. Secret encryption at rest was disabled.
- Both production absence checks passed. All nine whitelist objects were
  created with create-only semantics; no object was overwritten and no
  credential was written to Git.
- Kubelet recovered the existing Pods without deletion or a manual restart.
  Ops Agent reached `2/2` Ready, Sub2API and its Redis reached `1/1`, and a
  90-second stability observation showed no additional restart.
- PostgreSQL remained `1/1` on its existing 95-day Pod in the separate
  `database` namespace. The post-prune replacement Ops Agent, Sub2API, and
  Redis PVCs remained Bound during Secret restoration; the pre-incident
  `opencode-data`, Redis AOF, `sub2api-data`, and filing-site photos local-path
  contents had no snapshot and were not recovered. Filing-site and its excluded
  Secrets were not restored.
- Ops Agent health was healthy; OpenAI and Grok model checks returned HTTP
  `200`. Sub2API cluster and public health returned `200`; its public settings
  endpoint returned `200`. Ops Agent public access returned authenticated
  `200` and expected anonymous `401`.
- Both active hostnames resolved to `47.110.67.161`. Their nginx Ingresses and
  `lets-encrypt` certificates were Ready. ArgoCD reported `ops-docs`,
  `ops-agent`, and `sub2api` as `Synced` and `Healthy`.
- The only remaining application warning was a missing pricing record for
  `gemma4:31b`; it did not block model requests or service health.
- Cleanup removed the temporary data, token copy, exports, and logs. No
  temporary process, listener, or dummy link remained, and production k3s was
  still active and ready.
