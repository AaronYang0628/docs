+++
title = 'N8N'
date = 2024-03-07T15:00:59+08:00
weight = 14
+++

### 🚀Installation

{{< tabs groupid="environment" style="primary" title="Environment" icon="server" >}}

{{< tab title="ZJLAB" >}}
  {{< tabs groupid="install-method-zjlab" title="Install By" icon="thumbtack" >}}
  {{% tab title="🐙ArgoCD" %}}
  {{% include "/Installation/SNIPPET/_argo_cd_preliminary.md" %}}
  4. Database postgresql has been installed, if not check 🔗<a href="/docs/installation/database/postgresql/index.html" target="_blank">link</a> </p></br>

  <p> <b>1.prepare</b> `n8n-middleware-credentials.yaml` </p>
  

  {{% notice style="transparent" %}}
  ```bash
  kubectl get namespaces n8n > /dev/null 2>&1 || kubectl create namespace n8n
  N8N_PASSWORD=$(kubectl -n database get secret postgresql-credentials -o jsonpath='{.data.password}' | base64 -d)
  kubectl -n n8n create secret generic n8n-middleware-credential \
  --from-literal=postgres-password="${N8N_PASSWORD}"
  ```
  {{% /notice %}}

  <p> <b>2.prepare</b> `deploy-n8n.yaml` </p>

  {{% notice style="transparent" %}}
  ```yaml
  kubectl -n argocd apply -f - <<EOF
  apiVersion: argoproj.io/v1alpha1
  kind: Application
  metadata:
    name: n8n
  spec:
    project: default
    source:
      repoURL: https://community-charts.github.io/helm-charts
      targetRevision: 1.16.36
      helm:
        releaseName: n8n
        values: |
          global:
            security:
              allowInsecureImages: true
          image:
            repository: n8nio/n8n
          log:
            level: info
          encryptionKey: "ay-dev-n8n"
          timezone: Asia/Shanghai
          db:
            type: postgresdb
          externalPostgresql:
            host: postgresql-hl.database.svc.cluster.local
            port: 5432
            username: "n8n"
            database: "n8n"
            existingSecret: "n8n-middleware-credential"
          main:
            count: 1
            extraEnvVars:
              "N8N_BLOCK_ENV_ACCESS_IN_NODE": "false"
              "N8N_FILE_SYSTEM_ALLOWED_PATHS": "/home/node/.n8n-files"
              "EXECUTIONS_TIMEOUT": "300"
              "EXECUTIONS_TIMEOUT_MAX": "600"
              "DB_POSTGRESDB_POOL_SIZE": "10"
              "CACHE_ENABLED": "true"
              "N8N_CONCURRENCY_PRODUCTION_LIMIT": "5"
              "NODE_TLS_REJECT_UNAUTHORIZED": "0"
              "N8N_SECURE_COOKIE": "false"
              "WEBHOOK_URL": "https://webhook.n8n.dev.72602.online"
              "QUEUE_BULL_REDIS_TIMEOUT_THRESHOLD": "60000"
              "N8N_COMMUNITY_PACKAGES_ENABLED": "true"
              "N8N_GIT_NODE_DISABLE_BARE_REPOS": "true"
              "N8N_LICENSE_AUTO_RENEW_ENABLED": "true"
              "N8N_LICENSE_RENEW_ON_INIT": "true"
            persistence:
              enabled: true
              accessMode: ReadWriteOnce
              storageClass: "local-path"
              size: 50Gi
            volumes:
              - name: downloads-volume
                hostPath:
                  path: /home/aaron/Downloads
                  type: DirectoryOrCreate
            volumeMounts:
              - name: downloads-volume
                mountPath: /home/node/.n8n-files
            resources:
              requests:
                cpu: 1000m
                memory: 1024Mi
              limits:
                cpu: 2000m
                memory: 2048Mi
          worker:
            mode: queue
            count: 2
            waitMainNodeReady:
              enabled: false
            extraEnvVars:
              "N8N_FILE_SYSTEM_ALLOWED_PATHS": "/home/node/.n8n-files"
              "EXECUTIONS_TIMEOUT": "300"
              "EXECUTIONS_TIMEOUT_MAX": "600"
              "DB_POSTGRESDB_POOL_SIZE": "5"
              "QUEUE_BULL_REDIS_TIMEOUT_THRESHOLD": "60000"
              "N8N_COMMUNITY_PACKAGES_ENABLED": "true"
              "N8N_GIT_NODE_DISABLE_BARE_REPOS": "true"
              "N8N_LICENSE_AUTO_RENEW_ENABLED": "true"
              "N8N_LICENSE_RENEW_ON_INIT": "true"
            persistence:
              enabled: true
              accessMode: ReadWriteOnce
              storageClass: "local-path"
              size: 50Gi
            volumes:
              - name: downloads-volume
                hostPath:
                  path: /home/aaron/Downloads
                  type: DirectoryOrCreate
            volumeMounts:
              - name: downloads-volume
                mountPath: /home/node/.n8n-files
            resources:
              requests:
                cpu: 500m
                memory: 1024Mi
              limits:
                cpu: 1000m
                memory: 2048Mi
          nodes:
            builtin:
              enabled: true
              modules:
                - crypto
                - fs
            external:
              allowAll: true
              packages:
                - n8n-nodes-globals
          npmRegistry:
            enabled: true
            url: http://mirrors.cloud.tencent.com/npm/
          redis:
            enabled: true
            image:
              registry: m.daocloud.io/docker.io
              repository: bitnamilegacy/redis
            master:
              resourcesPreset: "small"
              persistence:
                enabled: true
                accessMode: ReadWriteOnce
                storageClass: "local-path"
                size: 10Gi
          ingress:
            enabled: true
            className: nginx
            annotations:
              kubernetes.io/ingress.class: nginx
              cert-manager.io/cluster-issuer: self-signed-ca-issuer
              nginx.ingress.kubernetes.io/proxy-connect-timeout: "300"
              nginx.ingress.kubernetes.io/proxy-send-timeout: "300"
              nginx.ingress.kubernetes.io/proxy-read-timeout: "300"
              nginx.ingress.kubernetes.io/proxy-body-size: "50m"
              nginx.ingress.kubernetes.io/upstream-keepalive-connections: "50"
              nginx.ingress.kubernetes.io/upstream-keepalive-timeout: "60"
              nginx.ingress.kubernetes.io/enable-cors: "true"
              nginx.ingress.kubernetes.io/cors-allow-origin: "https://webhook.n8n.dev.72602.online:32443"
              nginx.ingress.kubernetes.io/cors-allow-methods: "GET, POST, OPTIONS, PUT, DELETE"
              nginx.ingress.kubernetes.io/cors-allow-headers: "DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization"
              nginx.ingress.kubernetes.io/cors-allow-credentials: "true"
            hosts:
              - host: n8n.dev.72602.online
                paths:
                  - path: /
                    pathType: Prefix
              - host: webhook.n8n.dev.72602.online
                paths:
                  - path: /
                    pathType: Prefix
            tls:
            - hosts:
              - n8n.dev.72602.online
              - webhook.n8n.dev.72602.online
              secretName: n8n.dev.72602.online-tls
          webhook:
            mode: queue
            url: "https://webhook.n8n.dev.72602.online"
            autoscaling:
              enabled: false
            waitMainNodeReady:
              enabled: true
            resources:
              requests:
                cpu: 200m
                memory: 256Mi
              limits:
                cpu: 512m
                memory: 512Mi
      chart: n8n
    destination:
      server: https://kubernetes.default.svc
      namespace: n8n
    syncPolicy:
      syncOptions:
        - CreateNamespace=true
        - ApplyOutOfSyncOnly=false

  EOF
  ```
  {{% /notice %}}

  <p> <b>3.sync by argocd</b></p>

  {{% notice style="transparent" %}}
  ```bash
  argocd app sync argocd/n8n
  ```
  {{% /notice %}}

  {{% notice style="important" title="Using AY Helm Mirror" expanded="false" %}} 
  {{% include "/Installation/SNIPPET/_helm_chart_mirror.md" %}}
  {{% /notice %}}
  {{% notice style="important" title="Using AY ACR Image Mirror" expanded="false" %}} 
  {{% include "content\Installation\SNIPPET\_acr_image_mirror.md" %}}
  {{% /notice %}}
  {{% notice style="tip" title="Using DaoCloud Mirror" expanded="false" %}} 
  {{% include "content\Installation\SNIPPET\_daocloud_image_mirror.md" %}}
  {{% /notice %}}

  {{% /tab %}}
  {{< /tabs >}}
{{< /tab >}}

{{< tab title="72602" >}}
  {{< tabs groupid="install-method-72602" title="Install By" icon="thumbtack" >}}
  {{% tab title="🐙ArgoCD" %}}
  {{% include "/Installation/SNIPPET/_argo_cd_preliminary.md" %}}
  4. Database postgresql has been installed, if not check 🔗<a href="/docs/installation/database/postgresql/index.html" target="_blank">link</a> </p></br>

  <p> <b>1.verify retained credentials and storage</b> </p>
  

  {{% notice style="transparent" %}}
  ```bash
  kubectl get namespace n8n
  kubectl -n n8n get secret n8n-middleware-credential n8n-encryption-key-existing
  kubectl -n n8n get pvc
  ```
  {{% /notice %}}

  {{% notice style="important" %}}
  The live credentials and PVCs are retained state. Do not delete, recreate, or replace them when updating the Argo CD Application.
  {{% /notice %}}

  <p> <b>2.review and publish the canonical source</b> `manifests/n8n-argocd.yaml` </p>

  The n8n Argo CD Application is parent-managed by `argocd/ops-docs` from the repository's `main` branch and `manifests` path. n8n itself is manually synced after the parent Application has converged. The current chart is `1.24.42` and n8n is `2.40.5`.

  {{% notice style="transparent" %}}
  ```bash
  git diff --check
  git diff -- manifests/n8n-argocd.yaml
  git status --short
  git add manifests/n8n-argocd.yaml
  git commit -m "fix(n8n): configure AI model requests"
  git push origin main
  ```
  {{% /notice %}}

  <p> <b>3.wait for parent convergence, then manually sync n8n</b> </p>

  {{% notice style="transparent" %}}
  ```bash
  argocd app get argocd/ops-docs --insecure --grpc-web
  argocd app sync argocd/n8n --insecure --grpc-web
  argocd app get argocd/n8n --insecure --grpc-web
  kubectl -n n8n rollout status deployment/n8n --timeout=300s
  ```
  {{% /notice %}}

  Verify parent `argocd/ops-docs` is synced before manually syncing `argocd/n8n`. Review the Application diff and confirm the existing credentials and PVCs remain unchanged.

  <p> <b>4.verify</b> </p>

  {{% notice style="transparent" %}}
  ```bash
  argocd app get argocd/n8n --insecure --grpc-web
  kubectl -n n8n rollout status deployment/n8n --timeout=300s
  kubectl -n n8n get pods
  curl -sS -o /dev/null -w '%{http_code}\n' https://n8n.72602.space/healthz
  curl -sS -o /dev/null -w '%{http_code}\n' https://n8n.72602.space/healthz/readiness
  curl -sS -o /dev/null -w '%{http_code}\n' https://n8n.72602.space/
  ```
  {{% /notice %}}

  Confirm the Application is `Synced` and `Healthy`, the main Pod is Ready without restarts, and the health/readiness endpoints and public editor return HTTP 200.

  {{% /tab %}}
  {{< /tabs >}}
{{< /tab >}}

{{< /tabs >}}



### 🛎️FAQ

{{% expand title="Q1: n8n cannot connect to PostgreSQL" %}}
**Symptom**
- n8n Pod starts but keeps retrying DB connection.

**Check**
```bash
kubectl -n n8n get pods
kubectl -n n8n logs deploy/n8n -c n8n --tail=100
kubectl -n n8n get secret n8n-middleware-credential -o yaml
kubectl -n database get svc postgresql-hl
```

**Fix**
- Confirm secret key name matches chart expectation (`postgres-password`).
- Confirm DB host/port/user/database in values are correct.
- Ensure PostgreSQL is healthy before syncing n8n.

**Expected**
- n8n Pod reaches `Running` and UI becomes accessible.
{{% /expand %}}

{{% expand title="Q2: 72602 Argo CD reports Redis Secret and checksum drift" %}}
**Symptom**
- `Secret/n8n-redis` and `StatefulSet/n8n-redis-master` repeatedly report drift even though Redis is healthy.

**Root cause**
- The Redis subchart renders a generated password when no fixed password is supplied. A new desired render changes `/data/redis-password` and the derived pod-template `checksum/secret` without indicating live credential corruption.

**Fix**
- Preserve all live n8n credentials and PVCs. Do not delete, recreate, or replace them to resolve this drift.
- Keep `ignoreDifferences` limited to `/data/redis-password` and the Redis StatefulSet's `checksum/secret`, with `RespectIgnoreDifferences=true`.
- Review the remaining diff, then sync the Application only when it contains the intended values change.

```bash
argocd app diff argocd/n8n --insecure --grpc-web --refresh
argocd app sync argocd/n8n --insecure --grpc-web
argocd app get argocd/n8n --insecure --grpc-web
kubectl -n n8n rollout status deployment/n8n --timeout=300s
kubectl -n n8n rollout status statefulset/n8n-redis-master --timeout=300s
```

**Rollback**
- Remove only the two `ignoreDifferences` entries and `RespectIgnoreDifferences=true`, then reapply the Application. This restores drift reporting without changing the Secret or PVC.

**Expected**
- Argo CD reports `Synced` and `Healthy`; n8n and Redis remain Ready, and the existing PVCs remain `Bound`.
{{% /expand %}}

{{% expand title="Q3: Community nodes fail — \"Unrecognized node type\" after pod restart" %}}
**Symptom**
- Webhook 或 workflow 报 `Unrecognized node type: n8n-nodes-xxx`
- 社区包在 Pod 重启后消失

**Root cause**
- Helm chart 内置 initContainer 使用 `node:20-alpine`，缺少 Python
- 含 native 依赖的包（如 `isolated-vm`）npm install 失败，导致所有社区包未安装
- 对 webhook pod，chart 默认不提供社区节点 volume/initContainer

**Fix (permanent, survives ArgoCD sync)**
{{< tabs groupid="n8n-community-fix" >}}
{{< tab title="72602" >}}
核心思路：chart 内置 initContainer 空跑，自定义 initContainer 注入到 `main/worker/webhook.initContainers`。

```yaml
nodes:
  external:
    packages: []   # 清空 chart 内置包列表，避免 native build 失败
main:
  volumes:
    - name: community-node-modules
      emptyDir: {}
  volumeMounts:
    - name: community-node-modules
      mountPath: /home/node/.n8n/nodes
  initContainers:
    - name: npm-install-community
      image: node:20-alpine
      command: ['/bin/sh', '-c']
      args:
        - |
          export COMMUNITY_PACKAGES="n8n-nodes-globals n8n-nodes-wechat-formatter n8n-nodes-browserless-api"
          mkdir -p /nodesdata/nodes
          echo "$COMMUNITY_PACKAGES" | sha256sum > /nodesdata/nodes/packages.hash.new
          if [ ! -f /nodesdata/nodes/packages.hash ] || ! cmp /nodesdata/nodes/packages.hash /nodesdata/nodes/packages.hash.new; then
            npm install --loglevel info --no-save --ignore-scripts $COMMUNITY_PACKAGES --prefix /nodesdata/nodes
            mv /nodesdata/nodes/packages.hash.new /nodesdata/nodes/packages.hash
          fi
      env:
        - name: HTTP_PROXY
          value: http://192.168.0.25:17890
        - name: HTTPS_PROXY
          value: http://192.168.0.25:17890
      volumeMounts:
        - name: community-node-modules
          mountPath: /nodesdata/nodes
      securityContext:
        runAsUser: 1000
        runAsGroup: 1000
        runAsNonRoot: true
# worker 和 webhook 同样添加上述 volumes/volumeMounts/initContainers
worker:
  volumes: ...
  volumeMounts: ...
  initContainers: ...
webhook:
  volumes: ...
  volumeMounts: ...
  initContainers: ...
```

> `--ignore-scripts` 是关键：跳过 `isolated-vm` 等 native 依赖编译，`node:20-alpine` 不含 Python 也能装。
{{< /tab >}}
{{< tab title="ZJ" >}}
同上，只需修改：
- `HTTP_PROXY`/`HTTPS_PROXY` 按 ZJ 集群代理地址填写
- `COMMUNITY_PACKAGES` 按需调整
{{< /tab >}}
{{< /tabs >}}

**Manual emergency fix (quick)**
```bash
# 在每个 Pod 内手动安装
kubectl exec -n n8n deploy/n8n -- sh -c \
  "cd /home/node/.n8n/nodes && npm install --ignore-scripts n8n-nodes-globals n8n-nodes-wechat-formatter n8n-nodes-browserless-api"
kubectl exec -n n8n statefulset/n8n-worker -- sh -c \
  "cd /home/node/.n8n/nodes && npm install --ignore-scripts n8n-nodes-globals n8n-nodes-wechat-formatter n8n-nodes-browserless-api"
# 重启 n8n 加载新节点
kubectl delete pods -n n8n -l app.kubernetes.io/component=main
kubectl delete pods -n n8n -l app.kubernetes.io/component=worker
```

**Expected**
- `kubectl exec -n n8n deploy/n8n -- ls /home/node/.n8n/nodes/node_modules/ | grep n8n` 有输出
- Webhook 返回正常响应（非 `Unrecognized node type`）
{{% /expand %}}

{{% expand title="Q4: AI Agent requests fail through the proxy or during tool rounds" %}}
**Symptoms**
- An AI Agent call fails with `AI_APICallError: Cannot connect to API: other side closed` and `UND_ERR_SOCKET`.
- OpenAI-compatible Responses requests can work on the first turn but fail with HTTP 502 when a later tool round contains `item_reference`.

**Root causes**
- `@n8n/agents` `createModel` unconditionally constructs a `ProxyAgent` from uppercase `HTTP_PROXY`/`HTTPS_PROXY` and does not honor `NO_PROXY`. Internal cluster traffic is sent to the host proxy and can be closed.
- The OpenAI provider uses `/v1/responses`; default stored response history includes `item_reference` in multi-step tool requests, which the configured upstream does not handle.

**Fix**
- Use the canonical `manifests/n8n-argocd.yaml`; do not create a second inline Application definition.
- Add literal lowercase `http_proxy`, `https_proxy`, and `no_proxy` entries to `main.extraEnv` before the existing API-key Secret reference; set both proxy values to `http://192.168.0.25:17890` and `no_proxy` to `registry.npmjs.org,npmjs.org,npmmirror.com,registry.npmmirror.com,.svc,.cluster.local,10.0.0.0/8`. Keep uppercase `NO_PROXY` with the same list in `main.extraEnvVars`. Chart `1.24.42` uppercases every `main.extraEnvVars` key, so lowercase entries there do not work; inspect the Helm-rendered final environment, not only the YAML spellings. Leave worker and init-container proxy settings unchanged.
- Set `N8N_INSTANCE_AI_MODEL=custom/gpt-6-astra`, `N8N_INSTANCE_AI_MODEL_URL=http://sub2api.application.svc.cluster.local:8080/v1`, and `N8N_INSTANCE_AI_SEARXNG_URL=http://searxng.searxng.svc.cluster.local:8080/`. Reference the key through `n8n-assistant-model` Secret key `api-key`; do not put the key in values or logs.
- Lowercase proxy variables remain available to normal n8n HTTP transports, while the AI model factory uses the direct internal endpoint.

**Verification scope**
- Confirmed synthetic `@n8n/agents` `createModel` streaming tests reproduce the uppercase-proxy socket failure and pass when the internal model URL is direct.
- A direct Responses request succeeds on the first turn but its second `item_reference` request returns 502; a `store:false` roundtrip passes. Selecting the custom provider's stateless `/v1/chat/completions` route passes a synthetic tool roundtrip (two steps, one tool call, no stream errors, `finishReason=stop`).
- Repair commit `768558f` is deployed. Argo CD Application `argocd/n8n` is `Synced` and `Healthy` with Manual sync policy, chart `1.24.42`, and image `2.40.5`. Main Pod `n8n-7bbfdd6f4d-grm7p`, created `2026-09-30T05:57:07Z`, is Ready `1/1` with zero restarts.
- The final main Pod has no uppercase `HTTP_PROXY`/`HTTPS_PROXY`; lowercase `http_proxy`/`https_proxy` and both `NO_PROXY`/`no_proxy` are present. Normal environment proxy resolution routes internal requests `DIRECT` and external requests through `http://192.168.0.25:17890`.
- In an isolated subprocess using the final main Pod environment without candidate overrides, the n8n image's actual `createInstanceAgent` and `streamAgentRun` completed a research run with `custom/gpt-6-astra` and `@n8n/ai-utilities` `searxngSearch`: exactly one search returned three results; both `/v1/chat/completions` calls returned HTTP 200; events were `text-delta` 20, `tool-call` 1, and `tool-result` 1; final status was `completed`.
- In that subprocess, other workflow, credential, and data-service adapters were empty or read-only, and no persisted browser session was used. The n8n UI has not been clicked, so this does not establish full UI validation.
- Main `/healthz` and `/healthz/readiness` and the public editor return HTTP 200. A public unknown synthetic `/webhook/` route returns the expected unregistered-webhook HTTP 404. Main, worker, webhook, MCP, and Redis components are Ready with zero restarts; fresh main logs contain zero assistant socket errors.

**Deploy and rollback**
- Review and push the manifest change to `main`, wait for parent `argocd/ops-docs` convergence, then manually sync `argocd/n8n` in the order above.
- If the repair must be rolled back, create and push a new Git revert of `768558f`, wait for parent convergence, and manually sync n8n again. Do not restore the old inline Application recipe or revert unrelated changes.
{{% /expand %}}
