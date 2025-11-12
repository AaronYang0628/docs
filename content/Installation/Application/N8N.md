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
  kubectl -n argocd apply -f - << EOF
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
          image:
            repository: m.daocloud.io/docker.io/n8nio/n8n
            tag: 1.119.1-amd64
          log:
            level: info
          encryptionKey: 72602-aaron
          db:
            type: postgresdb
          externalPostgresql:
            host: postgresql.database.svc.cluster.local
            port: 5432
            username: "postgres.kconxfeltufjzqtjznfb"
            database: "postgres"
            existingSecret: "n8n-middleware-credential"
          main:
            count: 1
            persistence:
              enabled: true
              accessMode: ReadWriteOnce
              storageClass: "local-path"
              size: 5Gi
            resources:
              requests:
                cpu: 100m
                memory: 128Mi
              limits:
                cpu: 512m
                memory: 512Mi
          worker:
            mode: queue
            count: 2
            waitMainNodeReady:
              enabled: true
            persistence:
              enabled: true
              accessMode: ReadWriteOnce
              storageClass: "local-path"
              size: 5Gi
            resources:
              requests:
                cpu: 500m
                memory: 250Mi
              limits:
                cpu: 1000m
                memory: 1024Mi
          externalRedis:
            host: redis.72602.online
            port: 30679
            existingSecret: n8n-middleware-credential
          ingress:
            enabled: true
            className: nginx
            annotations:
              kubernetes.io/ingress.class: nginx
              cert-manager.io/cluster-issuer: letsencrypt
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
                cpu: 100m
                memory: 128Mi
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