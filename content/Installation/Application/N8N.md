+++
title = 'N8N'
date = 2024-03-07T15:00:59+08:00
weight = 14
+++

### 🚀Installation

{{< tabs groupid="xxxx" style="primary" title="Install By" icon="thumbtack" >}}


{{< tab title="🐙ArgoCD" style="transparent" >}}
  {{% include "content\Installation\SNIPPET\_argo_cd_preliminary.md" %}}

  <p> <b>1.prepare</b> `xxxxx-credientials.yaml` </p>

  {{% notice style="transparent" %}}
  ```yaml

  ```
  {{% /notice %}}

  <p> <b>2.prepare</b> `deploy-xxxxx.yaml` </p>

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
      repoURL: https://aaronyang0628.github.io/helm-chart-mirror/charts
      chart: n8n
      targetRevision: 1.16.1
      helm:
        releaseName: n8n
        values: |
          global:
            security:
              allowInsecureImages: true
          image:
            repository: m.daocloud.io/docker.io/n8nio/n8n
            tag: 1.119.1-amd64
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
              "N8N_BLOCK_ENV_ACCESS_IN_NODE": "false"
              "EXECUTIONS_TIMEOUT": "300"
              "EXECUTIONS_TIMEOUT_MAX": "600"
              "DB_POSTGRESDB_POOL_SIZE": "10"
              "CACHE_ENABLED": "true"
              "N8N_CONCURRENCY_PRODUCTION_LIMIT": "5"
              "N8N_SECURE_COOKIE": "false"
              "WEBHOOK_URL": "https://webhook.72602.online"
              "QUEUE_BULL_REDIS_TIMEOUT_THRESHOLD": "30000"
              "N8N_COMMUNITY_PACKAGES_ENABLED": "false"
              "N8N_GIT_NODE_DISABLE_BARE_REPOS": "true"
            persistence:
              enabled: true
              accessMode: ReadWriteOnce
              storageClass: "local-path"
              size: 5Gi
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
              "EXECUTIONS_TIMEOUT": "300"
              "EXECUTIONS_TIMEOUT_MAX": "600"
              "DB_POSTGRESDB_POOL_SIZE": "5"
              "QUEUE_BULL_REDIS_TIMEOUT_THRESHOLD": "30000"
              "N8N_GIT_NODE_DISABLE_BARE_REPOS": "true"
            persistence:
              enabled: true
              accessMode: ReadWriteOnce
              storageClass: "local-path"
              size: 5Gi
            resources:
              requests:
                cpu: 500m
                memory: 1024Mi
              limits:
                cpu: 1000m
                memory: 2048Mi
          redis:
            enabled: true
            image:
              registry: m.daocloud.io/docker.io
              repository: bitnamilegacy/redis
            master:
              persistence:
                enabled: true
                accessMode: ReadWriteOnce
                storageClass: "local-path"
                size: 2Gi
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
            tls:
            - hosts:
              - n8n.72602.online
              secretName: n8n.72602.online-tls
          webhook:
            mode: queue
            url: "https://webhook.72602.online"
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
    syncPolicy:
      automated:
        prune: true
        selfHeal: true
      syncOptions:
        - CreateNamespace=true
        - ApplyOutOfSyncOnly=true
    destination:
      server: https://kubernetes.default.svc
      namespace: n8n
  EOF
  ```
  {{% /notice %}}

  <p> <b>3.sync by argocd</b></p>

  {{% notice style="transparent" %}}
  ```bash
  argocd app sync argocd/xxxx
  ```
  {{% /notice %}}

  {{% notice style="important" title="Using AY Helm Mirror" expanded="false" %}} 
  {{% include "content\Installation\SNIPPET\_helm_chart_mirror.md" %}}
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