+++
title = 'N8N'
date = 2024-03-07T15:00:59+08:00
weight = 14
+++

### 🚀Installation

{{< tabs groupid="xxxx" style="primary" title="Install By" icon="thumbtack" >}}


{{< tab title="🐙ArgoCD (ZJ)" style="transparent" >}}
  {{% include "/Installation/SNIPPET/_argo_cd_preliminary.md" %}}
  4. Database postgresql has been installed, if not check 🔗<a href="/docs/installation/database/postgresql/index.html" target="_blank">link</a> </p></br>

  <p> <b>1.prepare</b> `n8n-middleware-credentials.yaml` </p>
  

  {{% notice style="transparent" %}}
  ```shell
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

{{< /tab >}}

{{< tab title="🐙ArgoCD (72602)" style="transparent" >}}
  {{% include "/Installation/SNIPPET/_argo_cd_preliminary.md" %}}
  4. Database postgresql has been installed, if not check 🔗<a href="/docs/installation/database/postgresql/index.html" target="_blank">link</a> </p></br>

  <p> <b>1.prepare</b> `n8n-middleware-credentials.yaml` </p>
  

  {{% notice style="transparent" %}}
  ```shell
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
    namespace: argocd
  spec:
    project: default
    source:
      repoURL: https://community-charts.github.io/helm-charts
      targetRevision: 1.16.36
      chart: n8n
      helm:
        releaseName: n8n
        values: |
          global:
            security:
              allowInsecureImages: true
          image:
            repository: m.daocloud.io/docker.io/n8nio/n8n
          log:
            level: info
          encryptionKey: "72602-n8n"
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
              HTTP_PROXY: "http://47.110.67.161:30890"
              HTTPS_PROXY: "http://47.110.67.161:30890"
              NO_PROXY: "registry.npmjs.org,npmjs.org,npmmirror.com,registry.npmmirror.com"
              no_proxy: "registry.npmjs.org,npmjs.org,npmmirror.com,registry.npmmirror.com"
              NPM_CONFIG_REGISTRY: "https://registry.npmmirror.com"
              N8N_BLOCK_ENV_ACCESS_IN_NODE: "false"
              N8N_FILE_SYSTEM_ALLOWED_PATHS: "/data"
              EXECUTIONS_TIMEOUT: "300"
              EXECUTIONS_TIMEOUT_MAX: "600"
              DB_POSTGRESDB_POOL_SIZE: "10"
              CACHE_ENABLED: "true"
              N8N_CONCURRENCY_PRODUCTION_LIMIT: "5"
              NODE_TLS_REJECT_UNAUTHORIZED: "0"
              N8N_SECURE_COOKIE: "false"
              WEBHOOK_URL: "https://webhook.n8n.72602.online"
              QUEUE_BULL_REDIS_TIMEOUT_THRESHOLD: "60000"
              N8N_COMMUNITY_PACKAGES_ENABLED: "true"
              N8N_GIT_NODE_DISABLE_BARE_REPOS: "true"
              N8N_LICENSE_AUTO_RENEW_ENABLED: "true"
              N8N_LICENSE_RENEW_ON_INIT: "true"
            persistence:
              enabled: true
              accessMode: ReadWriteOnce
              storageClass: "local-path"
              size: 5Gi
            volumes:
              - name: downloads-volume
                hostPath:
                  path: /mnt/e/N8N_DATA
                  type: DirectoryOrCreate
            volumeMounts:
              - name: downloads-volume
                mountPath: /data
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
              HTTP_PROXY: "http://47.110.67.161:30890"
              HTTPS_PROXY: "http://47.110.67.161:30890"
              NO_PROXY: "registry.npmjs.org,npmjs.org,npmmirror.com,registry.npmmirror.com"
              no_proxy: "registry.npmjs.org,npmjs.org,npmmirror.com,registry.npmmirror.com"
              NPM_CONFIG_REGISTRY: "https://registry.npmmirror.com"
              N8N_FILE_SYSTEM_ALLOWED_PATHS: "/data"
              EXECUTIONS_TIMEOUT: "300"
              EXECUTIONS_TIMEOUT_MAX: "600"
              DB_POSTGRESDB_POOL_SIZE: "5"
              QUEUE_BULL_REDIS_TIMEOUT_THRESHOLD: "60000"
              N8N_COMMUNITY_PACKAGES_ENABLED: "true"
              N8N_GIT_NODE_DISABLE_BARE_REPOS: "true"
              N8N_LICENSE_AUTO_RENEW_ENABLED: "true"
              N8N_LICENSE_RENEW_ON_INIT: "true"
            persistence:
              enabled: true
              accessMode: ReadWriteOnce
              storageClass: "local-path"
              size: 50Gi
            volumes:
              - name: downloads-volume
                hostPath:
                  path: /mnt/e/N8N_DATA
                  type: DirectoryOrCreate
            volumeMounts:
              - name: downloads-volume
                mountPath: /data
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
                - n8n-nodes-wechat-formatter
          npmRegistry:
            enabled: true
            url: https://registry.npmmirror.com
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
                size: 50Gi
          ingress:
            enabled: true
            className: nginx
            annotations:
              kubernetes.io/ingress.class: nginx
              cert-manager.io/cluster-issuer: letsencrypt
              nginx.ingress.kubernetes.io/proxy-connect-timeout: "300"
              nginx.ingress.kubernetes.io/proxy-send-timeout: "300"
              nginx.ingress.kubernetes.io/proxy-read-timeout: "300"
              nginx.ingress.kubernetes.io/proxy-body-size: "50m"
              nginx.ingress.kubernetes.io/upstream-keepalive-connections: "50"
              nginx.ingress.kubernetes.io/upstream-keepalive-timeout: "60"
            hosts:
              - host: n8n.72602.online
                paths:
                  - path: /
                    pathType: Prefix
              - host: webhook.n8n.72602.online
                paths:
                  - path: /
                    pathType: Prefix
            tls:
              - hosts:
                  - n8n.72602.online
                  - webhook.n8n.72602.online
                secretName: n8n.72602.online-tls
          webhook:
            mode: queue
            url: "https://webhook.n8n.72602.online"
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

