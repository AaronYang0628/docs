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

### 📦Shared Dependencies

- **Redis**: `manifests/storage/redis.yaml` → Bitnami Redis chart, standalone, 2Gi local-path
- **sub2api**: `manifests/application/sub2api-argocd.yaml` → AI API proxy
