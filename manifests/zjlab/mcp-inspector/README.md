# mcp-inspector (ZJLAB)

MCP Inspector 2.16.0 with `@modelcontextprotocol/server-everything` 2.3.1,
deployed on the ZJLAB k3s cluster for observing MCP streaming behavior
(progress / log notifications over the Inspector's SSE bridge).

Deployed 2026-11-25 with plain `kubectl apply` (not ArgoCD-managed).

## Access

| URL | Notes |
|---|---|
| `https://10.15.49.212:30080` | NodePort, primary |
| `https://10.15.51.75:30080` | NodePort via kube-proxy on worker |
| `https://10.15.49.212:6274` | Direct host port (pod is hostNetwork) |

**HTTPS is required, not a nicety.** The browser UI uses WebCrypto
(`crypto.subtle`, `crypto.randomUUID`), which only exists in Secure
Contexts — on plain HTTP those are `undefined` and every connect fails. The
certificate is self-signed with IP SANs for both node IPs: accept the
browser warning once per origin. Plain HTTP on the same ports is refused.
To rotate the cert, regenerate with the same SANs and re-apply the
`mcp-inspector-tls` secret, then restart the deployment.

The browser receives the API token automatically (`GET /` embeds
`window.__INSPECTOR_API_TOKEN__`). There is nothing to paste.

Security model (read before widening access):

- The Inspector's token guards against cross-origin browser requests only.
  **It is not access control** — anyone who can reach the page can act as the
  Inspector. The real boundary is the network layer: the node IPs are
  ZJLAB-internal with no public route.
- `ALLOWED_ORIGINS` pins the exact browser origins allowed to call the API
  (DNS-rebinding guard). Extend it in `deployment.yaml` when the access path
  changes, then restart.
- ZJLAB ingress-nginx was broken at deploy time (unrelated incident: nginx
  reload `kill(33,1) EPERM` restart loop), so this service deliberately uses a
  dedicated NodePort instead of an ingress. Revisit once ingress-nginx is
  healthy.

## Connecting MCP servers

The container runs with **no positional target** and `MCP_CATALOG_PATH=/data/mcp-catalog.json`,
which makes the server catalog **writable**: the UI shows the **Add Servers**
button and edits are saved. Launched with an ad-hoc server or `--config`
instead, the session is read-only by design (Inspector 2.16 semantics).

An initContainer seeds `/data/mcp-catalog.json` once per pod (existing file is
left untouched, so UI edits survive restarts until the pod is recreated):

- **everything** (demo): stdio, `mcp-server-everything`. Tools that stream:
  `trigger-long-running-operation` (5 progress notifications, 2 s apart),
  `trigger-log-messages`.
- **nanhu** (Nanhu platform bridge, runs on the host as `nanhu-bridge-mcp`
  on `127.0.0.1:8765`): streamable-http, `http://127.0.0.1:8765/mcp` —
  reachable because the pod is hostNetwork. Tools that stream:
  `wait_dev_env`, `sleep_dev_env`, `resume_dev_env` (progress via status
  changes), `follow_logs` (log stream).
- Any other streamable-HTTP MCP: add it in the UI with its URL. Stdio MCPs
  need their runtime baked into the image first (see below).

The image patches the served `index.html` with a `crypto.randomUUID`
polyfill (`docker/patch-insecure-context.mjs`), kept as a safety net for any
insecure-context access. TLS (see Access) is what actually provides the
Secure Context; the probes in `deployment.yaml` use `scheme: HTTPS` to match.

Catalog edits live in the pod's emptyDir: recreating the pod re-seeds the
baseline. To change the baseline, edit the `seed-catalog` args in
`deployment.yaml`.

"Streaming" here means MCP **progress/log notifications** arriving on the
Inspector's SSE channel while a tool runs — not model token-by-token output.

## Rebuild / operate

```bash
cd docker/
docker build -t localhost/mcp-inspector:2.16.0-everything-2.3.1 .
docker save localhost/mcp-inspector:2.16.0-everything-2.3.1 \
  | sudo k3s ctr -n k8s.io images import -
kubectl -n mcp-inspector rollout restart deploy/mcp-inspector
```

- The image is only on `zjlab-ubuntu`; the deployment pins it there with a
  nodeSelector and `imagePullPolicy: Never`.
- Rotate the API token:

  ```bash
  kubectl -n mcp-inspector create secret generic mcp-inspector-auth \
    --from-literal="token=$(openssl rand -hex 32)" \
    --dry-run=client -o yaml | kubectl apply -f -
  kubectl -n mcp-inspector rollout restart deploy/mcp-inspector
  ```

- Switch the seeded catalog baseline: edit the `seed-catalog` initContainer
  args in `deployment.yaml` (or edit `/data/mcp-catalog.json` in the UI).
  Note the image deliberately has no CMD: an empty `args: []` in a k8s
  container spec counts as "unset" and would leak an image CMD back into
  argv, which conflicts with catalog mode.

## Verify streaming (headless acceptance)

Scripts reproduce the browser's exact path: `POST /api/mcp/connect` →
`GET /api/mcp/events` (SSE) → `POST /api/mcp/send` (JSON-RPC). PASS requires
multiple `notifications/progress` to arrive **before** the final result.

```bash
TOKEN=$(kubectl -n mcp-inspector get secret mcp-inspector-auth \
  -o jsonpath='{.data.token}' | base64 -d)

# everything (stdio, preconfigured):
python3 -I verify-streaming-stdio.py https://10.15.49.212:30080 "$TOKEN"

# nanhu (streamable-http) — read-only calls only:
python3 -I verify-streaming-http.py https://10.15.49.212:30080 "$TOKEN" \
  http://127.0.0.1:8765/mcp
```

Both scripts skip TLS verification (self-signed cert) and proxy env.

Never echo the token into logs or commit it anywhere.
