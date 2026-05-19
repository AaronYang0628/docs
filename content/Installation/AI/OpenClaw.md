+++
title = 'OpenClaw'
date = 2024-03-07T15:00:59+08:00
weight = 14
+++

### 🚀Installation

{{< tabs groupid="xxxx" style="primary" title="Install By" icon="thumbtack" >}}


{{< tab title="🐙ArgoCD (ZJ)" style="transparent" >}}
  {{% include "/Installation/SNIPPET/_argo_cd_preliminary.md" %}}

  <p> <b>1.prepare</b> `openclaw-env-secret.yaml` </p>
  

  {{% notice style="transparent" %}}
  ```shell
  kubectl get namespaces claw > /dev/null 2>&1 || kubectl create namespace claw
  kubectl create secret generic openclaw-env-secret -n claw \
  --from-literal=ANTHROPIC_API_KEY=REPLACE_WITH_YOUR_API_KEY \
  --from-literal=OPENCLAW_GATEWAY_TOKEN=REPLACE_WITH_YOUR_TOKEN_KEY
  ```
  {{% /notice %}}

  <p> <b>2.prepare</b> `deploy-openclaw.yaml` </p>

  {{% notice style="transparent" %}}
  ```yaml
  kubectl -n argocd apply -f - <<EOF
  apiVersion: argoproj.io/v1alpha1
  kind: Application
  metadata:
    name: openclaw
    namespace: argocd
  spec:
    project: default
    source:
      repoURL: https://serhanekicii.github.io/openclaw-helm
      chart: openclaw
      targetRevision: 1.4.4
      helm:
        releaseName: openclaw
        values: |
          app-template:
            openclawVersion: "2026.2.23"
            chromiumVersion: "124"
            configMode: merge
            controllers:
              main:
                containers:
                  main:
                    image:
                      repository: ghcr.io/openclaw/openclaw
                      tag: "2026.2.23"
                      pullPolicy: IfNotPresent
                    envFrom:
                      - secretRef:
                          name: openclaw-env-secret
                    args:
                      - "gateway"
                      - "--bind"
                      - "lan"
                      - "--port"
                      - "18789"
                      - "--allow-unconfigured"
                    resources:
                      requests:
                        cpu: 200m
                        memory: 512Mi
                      limits:
                        cpu: 2000m
                        memory: 2Gi
                  chromium:
                    image:
                      repository: zenika/alpine-chrome
                      tag: "124"
                      pullPolicy: IfNotPresent
                    args:
                      - "--no-sandbox"
                      - "--disable-dev-shm-usage"
                      - "--remote-debugging-address=0.0.0.0"
                      - "--remote-debugging-port=9222"
                    resources:
                      requests:
                        cpu: 200m
                        memory: 512Mi
                      limits:
                        cpu: 2000m
                        memory: 2Gi
            persistence:
              data:
                enabled: true
                type: persistentVolumeClaim
                accessMode: ReadWriteOnce
                size: 10Gi
                globalMounts:
                  - path: /root/.openclaw
            ingress:
              main:
                enabled: true
                className: nginx
                annotations:
                  kubernetes.io/ingress.class: nginx
                  cert-manager.io/cluster-issuer: lets-encrypt
                  nginx.ingress.kubernetes.io/proxy-connect-timeout: "300"
                  nginx.ingress.kubernetes.io/proxy-send-timeout: "300"
                  nginx.ingress.kubernetes.io/proxy-read-timeout: "300"
                  nginx.ingress.kubernetes.io/proxy-body-size: "50m"
                  nginx.ingress.kubernetes.io/upstream-keepalive-connections: "50"
                  nginx.ingress.kubernetes.io/upstream-keepalive-timeout: "60"
                hosts:
                  - host: openclaw.dev.72602.online
                    paths:
                      - path: /
                        pathType: Prefix
                        service:
                          identifier: main
                          port: http
                tls:
                  - secretName: openclaw-tls
                    hosts:
                      - openclaw.dev.72602.online
            configMaps:
              config:
                data:
                  openclaw.json: |
                    {
                      gateway: {
                        controlUi: {
                          allowedOrigins: ["https://openclaw.dev.72602.online"],
                          dangerouslyAllowHostHeaderOriginFallback: true,
                        },
                      },
                      browser: {
                        gatewayToken: "${OPENCLAW_GATEWAY_TOKEN}",
                      },
                      agents: {
                        main: {
                          brain: {
                            provider: "anthropic",
                            model: "claude-sonnet-4-20250514",
                            apiKey: "${ANTHROPIC_API_KEY}",
                          },
                        },
                      },
                    }
    destination:
      server: https://kubernetes.default.svc
      namespace: claw
    syncPolicy:
      automated:
        prune: true
        selfHeal: true
      syncOptions:
        - CreateNamespace=true
        - ApplyOutOfSyncOnly=false
  EOF
  ```
  {{% /notice %}}

  <p> <b>3.sync by argocd</b></p>

  {{% notice style="transparent" %}}
  ```bash
  argocd app sync argocd/openclaw
  ```
  {{% /notice %}}

  <!-- {{% notice style="important" title="Using AY Helm Mirror" expanded="false" %}} 
  {{% include "/Installation/SNIPPET/_helm_chart_mirror.md" %}}
  {{% /notice %}}
  {{% notice style="important" title="Using AY ACR Image Mirror" expanded="false" %}} 
  {{% include "content\Installation\SNIPPET\_acr_image_mirror.md" %}}
  {{% /notice %}}
  {{% notice style="tip" title="Using DaoCloud Mirror" expanded="false" %}} 
  {{% include "content\Installation\SNIPPET\_daocloud_image_mirror.md" %}}
  {{% /notice %}} -->

{{< /tab >}}

{{< tab title="🐙ArgoCD (72602)" style="transparent" >}}
  {{% include "/Installation/SNIPPET/_argo_cd_preliminary.md" %}}

  <p> <b>1.prepare</b> `openclaw-env-secret.yaml` </p>

  {{% notice style="transparent" %}}
  ```shell
  kubectl get namespaces claw > /dev/null 2>&1 || kubectl create namespace claw
  kubectl create secret generic openclaw-env-secret -n claw \
  --from-literal=ANTHROPIC_API_KEY=REPLACE_WITH_YOUR_API_KEY \
  --from-literal=OPENCLAW_GATEWAY_TOKEN=REPLACE_WITH_YOUR_TOKEN_KEY
  ```
  {{% /notice %}}

  <p> <b>2.prepare</b> `deploy-openclaw.yaml` </p>

  {{% notice style="transparent" %}}
  ```yaml
  kubectl -n argocd apply -f - <<EOF
  apiVersion: argoproj.io/v1alpha1
  kind: Application
  metadata:
    name: openclaw
    namespace: argocd
  spec:
    project: default
    source:
      repoURL: https://serhanekicii.github.io/openclaw-helm
      chart: openclaw
      targetRevision: 1.4.4
      helm:
        releaseName: openclaw
        values: |
          app-template:
            openclawVersion: "2026.2.23"
            chromiumVersion: "124"
            configMode: merge
            controllers:
              main:
                containers:
                  main:
                    image:
                      repository: ghcr.io/openclaw/openclaw
                      tag: "2026.2.23"
                      pullPolicy: IfNotPresent
                    envFrom:
                      - secretRef:
                          name: openclaw-env-secret
                    args:
                      - "gateway"
                      - "--bind"
                      - "lan"
                      - "--port"
                      - "18789"
                      - "--allow-unconfigured"
                    resources:
                      requests:
                        cpu: 200m
                        memory: 512Mi
                      limits:
                        cpu: 2000m
                        memory: 2Gi
                  chromium:
                    image:
                      repository: zenika/alpine-chrome
                      tag: "124"
                      pullPolicy: IfNotPresent
                    args:
                      - "--no-sandbox"
                      - "--disable-dev-shm-usage"
                      - "--remote-debugging-address=0.0.0.0"
                      - "--remote-debugging-port=9222"
                    resources:
                      requests:
                        cpu: 200m
                        memory: 512Mi
                      limits:
                        cpu: 2000m
                        memory: 2Gi
            persistence:
              data:
                enabled: true
                type: persistentVolumeClaim
                accessMode: ReadWriteOnce
                size: 10Gi
                globalMounts:
                  - path: /root/.openclaw
            ingress:
              main:
                enabled: true
                className: nginx
                annotations:
                  kubernetes.io/ingress.class: nginx
                  cert-manager.io/cluster-issuer: lets-encrypt
                  nginx.ingress.kubernetes.io/proxy-connect-timeout: "300"
                  nginx.ingress.kubernetes.io/proxy-send-timeout: "300"
                  nginx.ingress.kubernetes.io/proxy-read-timeout: "300"
                  nginx.ingress.kubernetes.io/proxy-body-size: "50m"
                  nginx.ingress.kubernetes.io/upstream-keepalive-connections: "50"
                  nginx.ingress.kubernetes.io/upstream-keepalive-timeout: "60"
                hosts:
                  - host: openclaw.72602.online
                    paths:
                      - path: /
                        pathType: Prefix
                        service:
                          identifier: main
                          port: http
                tls:
                  - secretName: openclaw-tls
                    hosts:
                      - openclaw.72602.online
            configMaps:
              config:
                data:
                  openclaw.json: |
                    {
                      gateway: {
                        controlUi: {
                          allowedOrigins: ["https://openclaw.72602.online"],
                          dangerouslyAllowHostHeaderOriginFallback: true,
                        },
                      },
                      browser: {
                        gatewayToken: "${OPENCLAW_GATEWAY_TOKEN}",
                      },
                      agents: {
                        main: {
                          brain: {
                            provider: "anthropic",
                            model: "claude-sonnet-4-20250514",
                            apiKey: "${ANTHROPIC_API_KEY}",
                          },
                        },
                      },
                    }
    destination:
      server: https://kubernetes.default.svc
      namespace: claw
    syncPolicy:
      automated:
        prune: true
        selfHeal: true
      syncOptions:
        - CreateNamespace=true
        - ApplyOutOfSyncOnly=false
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