+++
title = 'OpenCode'
date = 2024-03-07T15:00:59+08:00
weight = 14
+++

### 🚀Installation

{{< tabs groupid="xxxx" style="primary" title="Install By" icon="thumbtack" >}}


{{< tab title="🐙ArgoCD (ZJ)" style="transparent" >}}
  {{% include "/Installation/SNIPPET/_argo_cd_preliminary.md" %}}

  <p> <b>1.prepare</b> `opencode-configuration.yaml` </p>
  

  {{% notice style="transparent" %}}
  ```shell
  kubectl get namespaces opencode > /dev/null 2>&1 || kubectl create namespace opencode

  kubectl -n opencode create secret generic opencode-server-secret \
    --from-literal=OPENCODE_SERVER_PASSWORD=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16)

  kubectl -n opencode apply -f - <<EOF
  apiVersion: v1
  kind: ConfigMap
  metadata:
    name: opencode-config
    namespace: opencode
  data:
    opencode.json: |
      {
        "\$schema": "https://opencode.ai/config.json",
        "model": "zzz/claude-sonnet-4-5-20250929-thinking",
        "small_model": "zzz/claude-sonnet-4-5-20250929-thinking",
        "provider": {
          "zzz": {
            "name": "中转站",
            "npm": "@ai-sdk/openai-compatible",
            "options": {
              "baseURL": "http://154.37.218.75:3000/v1",
              "apiKey": "sk-uMA2rRCqxr5kSnnyD1JGPnzoCnhlnCN73UAcCF1SjYfwV4JC"
            },
            "models": {
              "claude-sonnet-4-5-20250929-thinking": {
                "name": "Claude Sonnet 4.5 Thinking",
                "reasoning": true,
                "limit": {
                  "context": 200000,
                  "output": 32000
                },
                "modalities": {
                  "input": ["text", "image"],
                  "output": ["text"]
                },
                "options": {
                  "interleaved": {
                    "field": "reasoning_content"
                  }
                }
              }
            }
          }
        },
        "disabled_providers": []
      }
  EOF
  ```
  {{% /notice %}}

  <p> <b>2.prepare</b> `deploy-n8n.yaml` </p>

  {{% notice style="transparent" %}}
  ```yaml
  kubectl -n argocd apply -f - <<'EOF'
  apiVersion: argoproj.io/v1alpha1
  kind: Application
  metadata:
    name: opencode
    namespace: argocd
  spec:
    project: default

    source:
      repoURL: oci://ghcr.io/fluxbase-eu/opencode
      targetRevision: 0.13.0
      chart: opencode
      helm:
        values: |
          image:
            repository: ghcr.io/fluxbase-eu/opencode-docker
            tag: latest
            pullPolicy: Always
          replicaCount: 1
          command:
            - opencode
          args:
            - serve
            - --port
            - "4000"
            - --hostname
            - "0.0.0.0"
          service:
            type: ClusterIP
            port: 4000
          env:
            OPENCODE_PORT: "4000"
          extraVolumes:
            - name: opencode-config
              configMap:
                name: opencode-config
          extraVolumeMounts:
            - name: opencode-config
              mountPath: /home/opencode/.config/opencode/opencode.json
              subPath: opencode.json
              readOnly: true
          persistence:
            config:
              enabled: false 
            data:
              enabled: true
              size: 1Gi
              storageClass: local-path
            workspace:
              enabled: true
              size: 5Gi
              storageClass: local-path
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              cpu: 2
              memory: 4Gi
          probes:
            liveness:
              tcpSocket:
                port: 4000
              initialDelaySeconds: 15
              periodSeconds: 30
            readiness:
              tcpSocket:
                port: 4000
              initialDelaySeconds: 10
              periodSeconds: 10
            startup:
              tcpSocket:
                port: 4000
              initialDelaySeconds: 5
              periodSeconds: 5
              failureThreshold: 30
          ingress:
            enabled: false
          globalLabels:
            app.kubernetes.io/part-of: opencode
            environment: production

    destination:
      server: https://kubernetes.default.svc
      namespace: opencode
    syncPolicy:
      syncOptions:
        - CreateNamespace=true
        - ServerSideApply=true
  EOF
  ```
  {{% /notice %}}

  <p> <b>3.sync by argocd</b></p>

  {{% notice style="transparent" %}}
  ```bash
  argocd app sync argocd/openclaw
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

  <p> <b>1.prepare</b> `n8n-middleware-credientials.yaml` </p>
  

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
      targetRevision: 1.16.22
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
              "WEBHOOK_URL": "https://webhook.n8n.ay.dev"
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
            hosts:
              - host: n8n.ay.dev
                paths:
                  - path: /
                    pathType: Prefix
            tls:
            - hosts:
              - n8n.ay.dev
              - webhook.n8n.ay.dev
              secretName: n8n.ay.dev-tls
          webhook:
            mode: queue
            url: "https://webhook.n8n.ay.dev"
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


{{< /tabs >}}



### 🛎️FAQ

{{% expand title="Q1: Show me almost **endless** possibilities" %}}
You can add standard markdown syntax:

- multiple paragraphs
- bullet point lists
- _emphasized_, **bold** and even **_bold emphasized_** text
- [links](https://example.com)
- etc.

```plaintext
...and even source code
```

> the possibilities are endless (almost - including other shortcodes may or may not work)
{{% /expand %}}


{{% expand title="Q2: Show me almost **endless** possibilities" %}}
You can add standard markdown syntax:

- multiple paragraphs
- bullet point lists
- _emphasized_, **bold** and even **_bold emphasized_** text
- [links](https://example.com)
- etc.

```plaintext
...and even source code
```

> the possibilities are endless (almost - including other shortcodes may or may not work)
{{% /expand %}}