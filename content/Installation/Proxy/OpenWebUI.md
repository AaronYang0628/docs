+++
title = 'Open WebUI'
date = 2026-05-12T15:00:59+08:00
weight = 15
+++

### Web Page
[https://txt2img.agent.72602.online](https://txt2img.agent.72602.online)

### 🚀Installation

{{< tabs groupid="xxxx" style="primary" title="Install By" icon="thumbtack" >}}

{{< tab title="🐙ArgoCD (72602)" style="transparent" >}}
  {{% include "/Installation/SNIPPET/_argo_cd_preliminary.md" %}}

  <p> <b>1.prepare Redis URL secret</b> </p>

  ```shell
  REDIS_PASS=$(kubectl -n storage get secret redis-shared-credentials -o jsonpath='{.data.redis-password}' | base64 -d)
  kubectl -n ai create secret generic open-webui-redis-url \
    --from-literal=redis-url="redis://:${REDIS_PASS}@redis-shared-master.storage.svc.cluster.local:6379/0"
  ```

  <p> <b>2.prepare TLS certificate</b> </p>

  ```shell
  kubectl -n ai apply -f - <<'EOF'
  apiVersion: cert-manager.io/v1
  kind: Certificate
  metadata:
    name: txt2img-agent-tls
  spec:
    secretName: txt2img-agent-tls
    dnsNames:
      - txt2img.agent.72602.online
    issuerRef:
      name: lets-encrypt
      kind: ClusterIssuer
  EOF
  ```

  <p> <b>3.deploy via ArgoCD</b> </p>

  ```shell
  kubectl -n argocd apply -f - <<'EOF'
  apiVersion: argoproj.io/v1alpha1
  kind: Application
  metadata:
    name: open-webui
  spec:
    project: default
    syncPolicy:
      automated:
        prune: true
        selfHeal: true
      syncOptions:
        - CreateNamespace=true
    source:
      repoURL: https://open-webui.github.io/helm-charts
      chart: open-webui
      targetRevision: 14.5.0
      helm:
        releaseName: open-webui
        values: |
          image:
            repository: m.daocloud.io/ghcr.io/open-webui/open-webui
            pullPolicy: IfNotPresent
          ollama:
            enabled: false
          pipelines:
            enabled: false
          websocket:
            enabled: true
            manager: redis
            existingSecret: open-webui-redis-url
            existingSecretKey: redis-url
            redis:
              enabled: false
          ingress:
            enabled: true
            class: nginx
            host: txt2img.agent.72602.online
            tls: true
            existingSecret: txt2img-agent-tls
            annotations:
              cert-manager.io/cluster-issuer: lets-encrypt
          persistence:
            enabled: true
            size: 2Gi
            storageClass: local-path
          extraEnvVars:
            - name: OPENAI_API_BASE_URL
              value: "http://sub2api.application.svc.cluster.local:8080/v1"
            - name: DEFAULT_USER_ROLE
              value: "admin"
    destination:
      server: https://kubernetes.default.svc
      namespace: ai
  EOF
  ```

  <p> <b>4.verify</b> </p>

  ```shell
  argocd app get open-webui
  kubectl -n ai get pods -l app.kubernetes.io/instance=open-webui
  ```

{{< /tab >}}

{{< /tabs >}}

### ⚡72602 Cluster Config

| 配置项 | 值 |
|---|---|
| 域名 | `txt2img.agent.72602.online` |
| AI 后端 | `sub2api.application.svc:8080/v1`（OpenAI-compatible） |
| Redis | `redis-shared-master.storage.svc:6379`（共享） |
| 数据库 | SQLite（PVC 2Gi, local-path） |
| 镜像 | `m.daocloud.io/ghcr.io/open-webui/open-webui:0.9.5` |
| 部署方式 | ArgoCD Helm chart `open-webui-14.5.0` |

### 🛠️2026-05 实际部署记录（72602）

> 当前集群已按本文部署，`argocd/open-webui` 已创建并进入 `Synced`，首次启动会执行 DB migration，`StatefulSet` 短时间显示 `Progressing` 属于正常现象。

1. 准备 Redis URL Secret（`ai/open-webui-redis-url`）

```bash
REDIS_PASS=$(kubectl -n storage get secret redis-shared-credentials -o jsonpath='{.data.redis-password}' | base64 -d)
kubectl -n ai create secret generic open-webui-redis-url \
  --from-literal=redis-url="redis://:${REDIS_PASS}@redis-shared-master.storage.svc.cluster.local:6379/0" \
  --dry-run=client -o yaml | kubectl apply -f -
```

2. 确认证书（已存在可复用）

```bash
kubectl -n ai get certificate txt2img-agent-tls
```

3. 通过仓库清单部署 ArgoCD Application

```bash
kubectl -n argocd apply -f /home/aaron/Ops/docs/manifests/application/open-webui.yaml
```

4. 验证

```bash
argocd app get open-webui
kubectl -n ai get pods,svc,ingress
kubectl -n ai logs statefulset/open-webui --tail=120
```

### 🔁回滚步骤（OpenWebUI）

```bash
kubectl -n argocd delete application open-webui --ignore-not-found
kubectl -n ai delete ingress,svc,statefulset,pvc,secret -l app.kubernetes.io/instance=open-webui --ignore-not-found
kubectl -n ai delete secret open-webui-redis-url --ignore-not-found
```

若需恢复旧版本：

```bash
kubectl apply -f /home/aaron/Ops/docs/manifests/application/openwebui-backup-ai-20260513.yaml
```

### ✅验证结果（2026-05）

- `argocd/open-webui`: `Sync=Synced`, `Health=Progressing`（初始化阶段）
- `ai` 命名空间资源：
  - `StatefulSet/open-webui`
  - `Service/open-webui`
  - `Ingress/open-webui`（`txt2img.agent.72602.online`）
- 启动日志包含 Alembic migration，未出现 CrashLoopBackOff

### 📦Shared Dependencies

- **Redis**: `manifests/storage/redis.yaml` → Bitnami Redis chart, standalone, 2Gi local-path
- **sub2api**: `manifests/application/sub2api-argocd.yaml` → AI API proxy

### 🔧Operations (72602)

<p> <b>1.cleanup</b> `open-webui` </p>

```shell
kubectl delete application -n argocd open-webui --ignore-not-found
helm uninstall -n ai open-webui || true
kubectl -n ai delete ingress,statefulset,svc,secret,pvc -l app.kubernetes.io/instance=open-webui --ignore-not-found
```

<p> <b>2.rollback</b> `open-webui` </p>

```shell
kubectl apply -f /home/aaron/Ops/docs/manifests/openwebui-backup-ai-20260513.yaml
```

### 🧱Pitfalls we already hit (2026-05)

1. OpenWebUI image button only enables UI entry, not backend readiness.
2. `OPENAI_API_BASE_URL` and provider mapping may be overridden by persisted config (Redis/DB), so env var change alone may not take effect.
3. Using image-only model in chat path can trigger handler errors in 0.9.5:
   - `TypeError: 'JSONResponse' object is not subscriptable`
   - `TypeError: 'StreamingResponse' object is not subscriptable`
4. `sub2api` in-cluster endpoint may return `404` on `/v1/images/generations`; verify real upstream supports image endpoint before enabling image generation.
5. Browser cache / service worker can keep old API path and cause false 404 symptoms after frontend migration.

### ✅Monitor / Verify Checklist

```shell
argocd app get open-webui
kubectl -n ai get pods,svc,ingress
kubectl -n ai logs statefulset/open-webui --tail=200
curl -vkI https://txt2img.agent.72602.online
```

If image generation fails, verify in order:

1. upstream supports `/v1/images/generations`
2. provider/model mapping in OpenWebUI admin page
3. no stale client cache/service worker
