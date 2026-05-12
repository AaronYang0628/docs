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

  ```

  <p> <b>1.1.choose</b> different LLM configuration </p>

  {{< tabs groupid="tabs-example-language" >}}
  {{% tab title="gpt-codex" %}}
  ```shell
  kubectl -n opencode apply -f - <<'EOF'
  apiVersion: v1
  kind: ConfigMap
  metadata:
    name: opencode-config
  data:
    opencode.json: |
      {
        "provider": {
          "openai": {
            "options": {
              "baseURL": "https://v2.qixuw.com/v1",
              "apiKey": "sk-ss"
            },
            "models": {
              "gpt-5.3-codex-spark": {
                "name": "GPT-5.3 Codex Spark",
                "limit": {
                  "context": 128000,
                  "output": 32000
                },
                "options": {
                  "store": false
                },
                "variants": {
                  "low": {},
                  "medium": {},
                  "high": {},
                  "xhigh": {}
                }
              }
            }
          }
        },
        "agent": {
          "build": {
            "options": {
              "store": false
            }
          },
          "plan": {
            "options": {
              "store": false
            }
          }
        },
        "$schema": "https://opencode.ai/config.json"
      }
  EOF
  ```
  {{% /tab %}}
  {{% tab title="codex-with-astro-mcp" %}}
  ```shell
  kubectl -n opencode apply -f - <<'EOF'
  apiVersion: v1
  kind: ConfigMap
  metadata:
    name: opencode-config
  data:
    opencode.json: |
      {
        "provider": {
          "openai": {
            "options": {
              "baseURL": "https://v2.qixuw.com/v1",
              "apiKey": "sk-ss"
            },
            "models": {
              "gpt-5.3-codex-spark": {
                "name": "GPT-5.3 Codex Spark",
                "limit": {
                  "context": 128000,
                  "output": 32000
                },
                "options": {
                  "store": false
                },
                "variants": {
                  "low": {},
                  "medium": {},
                  "high": {},
                  "xhigh": {}
                }
              }
            }
          }
        },
        "mcp": {
          "euclid-catalog": {
            "type": "remote",
            "url": "https://catalog.euclid.mcp.ay.dev:32443/sse",
            "enabled": true
          },
          "astro_k3s_mcp": {
            "type": "remote",
            "url": "http://eva24002-entrance.lab.zverse.space:30082/mcp",
            "enabled": true,
            "oauth": false,
            "timeout": 15000
          }
        },
        "agent": {
          "build": {
            "options": {
              "store": false
            }
          },
          "plan": {
            "options": {
              "store": false
            }
          }
        },
        "$schema": "https://opencode.ai/config.json"
      }
  EOF
  ```
  {{% /tab %}}
  {{% tab title="local-minimax" %}}
  ```shell
  kubectl -n opencode apply -f - <<'EOF'
  apiVersion: v1
  kind: ConfigMap
  metadata:
    name: opencode-config
  data:
    opencode.json: |
      {
        "$schema": "https://opencode.ai/config.json",
        "provider": {
          "minimax": {
            "npm": "@ai-sdk/openai-compatible",
            "name": "MiniMax M2.5",
            "options": {
              "baseURL": "http://10.200.92.41:31551/v1",
              "apiKey": "sk-sss"
            },
            "models": {
              "minimax-m2.5": {
                "name": "MiniMax M2.5",
                "id": "MiniMaxAI/MiniMax-M2.5",
                "limit": {
                  "context": 196608,
                  "output": 8192
                }
              }
            }
          }
        },
        "model": "minimax/minimax-m2.5"
      }
  EOF
  ```
  {{% /tab %}}
  {{% tab title="free-minimax" %}}
  ```shell
  kubectl -n opencode apply -f - <<'EOF'
  apiVersion: v1
  kind: ConfigMap
  metadata:
    name: opencode-config
  data:
    opencode.json: |
      {
        "$schema": "https://opencode.ai/config.json",
        "model": "opencode/minimax-m2.5-free",
        "small_model": "opencode/minimax-m2.5-free"
      }
  EOF
  ```
  {{% /tab %}}
  {{% tab title="qiniuyun-minimax" %}}
  ```shell
  kubectl -n opencode apply -f - <<'EOF'
  apiVersion: v1
  kind: ConfigMap
  metadata:
    name: opencode-config
  data:
    opencode.json: |
      {
        "provider": {
          "qiniu": {
            "options": {
              "baseURL": "https://api.qnaigc.com/v1",
              "apiKey": "sk-sss"
            },
            "models": {
              "minimax-m2.5": {
                "name": "Minimax-M2.5",
                "limit": {
                  "context": 128000,
                  "output": 32000
                },
                "options": {
                  "store": false
                },
                "variants": {
                  "low": {},
                  "medium": {},
                  "high": {},
                  "xhigh": {}
                }
              }
            }
          }
        },
        "agent": {
          "build": {
            "options": {
              "store": false
            }
          },
          "plan": {
            "options": {
              "store": false
            }
          }
        },
        "$schema": "https://opencode.ai/config.json"
      }
  EOF
  ```
  {{% /tab %}}
  {{< /tabs >}}
 
  {{% /notice %}}

  <p> <b>2.prepare</b> `deploy-opencode.yaml`; change the default model when you apply a different ConfigMap</p> 

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
      repoURL: oci://ghcr.io/aaronyang0628/opencode
      targetRevision: 0.20.0
      chart: opencode
      helm:
        values: |
          image:
            repository: ghcr.io/nimbleflux/opencode-docker
            tag: 1.2.26
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
            enabled: true
            storageClass: local-path
            config:
              enabled: false 
            data:
              enabled: true
              size: 1Gi
            workspace:
              enabled: true
              size: 5Gi
            playbook:
              enabled: true
              mountPath: /home/opencode/workspace/playbook
              example:
                enabled: true
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
            enabled: true
            className: nginx
            annotations:
              kubernetes.io/ingress.class: nginx
              cert-manager.io/cluster-issuer: self-signed-ca-issuer
              nginx.ingress.kubernetes.io/proxy-connect-timeout: "600"
              nginx.ingress.kubernetes.io/proxy-send-timeout: "300"
              nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
              nginx.ingress.kubernetes.io/proxy-body-size: "50m"
              nginx.ingress.kubernetes.io/upstream-keepalive-connections: "50"
              nginx.ingress.kubernetes.io/upstream-keepalive-timeout: "60"
            hosts:
              - host: opencode.ay.dev
                paths:
                  - path: /
                    pathType: Prefix
            tls:
            - hosts:
              - opencode.ay.dev
              secretName: opencode.ay.dev-tls
          globalLabels:
            app.kubernetes.io/part-of: opencode
            environment: production
          bridge:
            enabled: true
            image:
              repository: crpi-wixjy6gci86ms14e.cn-hongkong.personal.cr.aliyuncs.com/ay-dev/opencode-bridge
              tag: "v20260326r4"
            env:
              defaultModel: "opencode/minimax-m2.5-free"
              openaiStreamChunkSize: "4"
              openaiStreamChunkDelayMs: "10"
              enableLeadingEchoFilter: "false"
            resources:
              limits:
                cpu: 500m
                memory: 256Mi
              requests:
                cpu: 100m
                memory: 128Mi
            ingress:
              enabled: true
              annotations:
                kubernetes.io/ingress.class: nginx
                cert-manager.io/cluster-issuer: self-signed-ca-issuer
                nginx.ingress.kubernetes.io/proxy-buffering: "off"
                nginx.ingress.kubernetes.io/proxy-request-buffering: "off"
                nginx.ingress.kubernetes.io/proxy-connect-timeout: "300"
                nginx.ingress.kubernetes.io/proxy-send-timeout: "300"
                nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
                nginx.ingress.kubernetes.io/proxy-body-size: "50m"
                nginx.ingress.kubernetes.io/upstream-keepalive-connections: "50"
                nginx.ingress.kubernetes.io/upstream-keepalive-timeout: "60"
              hosts:
                - host: opencode-bridge.ay.dev
                  paths:
                    - path: /
                      pathType: Prefix
              tls:
                - secretName: opencode-bridge-tls
                  hosts:
                    - opencode-bridge.ay.dev

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
  argocd app sync argocd/opencode
  ```
  {{% /notice %}}

  <p> <b>4.then you can talk with LLM with rest api</b></p>

  {{% notice style="transparent" %}}
  ```bash
  curl -k -X POST https://opencode.ay.dev:32443/session \
  -H "Content-Type: application/json" \
  -d '{"model": "opencode/minimax-m2.5-free"}'
  
  ## {"id":"ses_30a879abeffe6KRC0Rmg4aPrmK","slug":"brave-eagle","version":"1.2.26","projectID":"global","directory":"/home/opencode/workspace","title":"New session - 2026-03-16T07:07:14.113Z","time":{"created":1773644834113,"updated":1773644834113}}
  ```
  {{% /notice %}}

  <p> <b>5.reuse the same session</b></p>

  {{% notice style="transparent" %}}
  ```bash
  curl -k -X POST https://opencode.ay.dev:32443/session/ses_30a879abeffe6KRC0Rmg4aPrmK/message \
  -H "Content-Type: application/json" \
  -d '{"parts": [{"type": "text", "text": "你好"}]}'

  ## {"info":{"role":"assistant","time":{"created":1773644844131,"completed":1773644848700},"parentID":"msg_cf5788c12001RS4wX3hwMRe0If","modelID":"minimax-m2.5","providerID":"minimax","mode":"build","agent":"build","path":{"cwd":"/home/opencode/workspace","root":"/"},"cost":0,"tokens":{"total":10628,"input":10567,"output":61,"reasoning":0,"cache":{"read":0,"write":0}},"finish":"stop","id":"msg_cf5788c63001hBrorYejcHc1tO","sessionID":"ses_30a879abeffe6KRC0Rmg4aPrmK"},"parts":[{"type":"step-start","id":"prt_cf57899120016WXp4jT4AHeTiG","sessionID":"ses_30a879abeffe6KRC0Rmg4aPrmK","messageID":"msg_cf5788c63001hBrorYejcHc1tO"},{"type":"text","text":"<think>The user said \"你好\" which means \"Hello\" in Chinese. According to the instructions, I should be concise and direct. I should respond briefly without unnecessary preamble. Since this is a simple greeting, I can just respond with a greeting back.\n</think>\n\n你好！有什么可以帮你的吗？","time":{"start":1773644848689,"end":1773644848689},"id":"prt_cf5789913001dUZnoW9w63ThkC","sessionID":"ses_30a879abeffe6KRC0Rmg4aPrmK","messageID":"msg_cf5788c63001hBrorYejcHc1tO"},{"type":"step-finish","reason":"stop","cost":0,"tokens":{"total":10628,"input":10567,"output":61,"reasoning":0,"cache":{"read":0,"write":0}},"id":"prt_cf5789e35001dLGIXJb5WHizMX","sessionID":"ses_30a879abeffe6KRC0Rmg4aPrmK","messageID":"msg_cf5788c63001hBrorYejcHc1tO"}]}
  
  ```
  {{% /notice %}}


{{< /tab >}}


{{< tab title="🐙ArgoCD (72602)" style="transparent" >}}
  {{% include "/Installation/SNIPPET/_argo_cd_preliminary.md" %}}

  <p> <b>0. (optional) deploy</b> `oauth2-proxy` for GitHub OAuth 2FA </p>

  {{% notice style="transparent" %}}
  ```shell
  kubectl get namespaces oauth2-proxy > /dev/null 2>&1 || kubectl create namespace oauth2-proxy

  kubectl -n oauth2-proxy create secret generic oauth2-proxy-secret \
    --from-literal=client-id=<your-github-oauth-client-id> \
    --from-literal=client-secret=<your-github-oauth-client-secret> \
    --from-literal=cookie-secret=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 32)

  kubectl -n argocd apply -f - <<'EOF'
  apiVersion: argoproj.io/v1alpha1
  kind: Application
  metadata:
    name: oauth2-proxy
    namespace: argocd
  spec:
    project: default
    source:
      repoURL: oci://ghcr.io/aaronyang0628/oauth2-proxy
      targetRevision: 7.7.0
      chart: oauth2-proxy
      helm:
        values: |
          config:
            clientID: ""
            existingSecret: oauth2-proxy-secret
          extraEnv:
            - name: OAUTH2_PROXY_CLIENT_ID
              valueFrom:
                secretKeyRef:
                  name: oauth2-proxy-secret
                  key: client-id
            - name: OAUTH2_PROXY_CLIENT_SECRET
              valueFrom:
                secretKeyRef:
                  name: oauth2-proxy-secret
                  key: client-secret
            - name: OAUTH2_PROXY_COOKIE_SECRET
              valueFrom:
                secretKeyRef:
                  name: oauth2-proxy-secret
                  key: cookie-secret
          provider: github
          upstreams:
            - http://opencode:4000
          ingress:
            enabled: true
            className: nginx
            annotations:
              cert-manager.io/cluster-issuer: letsencrypt
            hosts:
              - host: ops.agent.72602.online
                paths:
                  - /
            tls:
              - secretName: ops.agent.72602.online-tls
                hosts:
                  - ops.agent.72602.online
    destination:
      server: https://kubernetes.default.svc
      namespace: oauth2-proxy
    syncPolicy:
      syncOptions:
        - CreateNamespace=true
  EOF
  ```
  {{% /notice %}}

  <p> <b>1.prepare</b> `opencode-configuration.yaml` </p>
  

  {{% notice style="transparent" %}}
  ```shell
  kubectl get namespaces opencode > /dev/null 2>&1 || kubectl create namespace opencode

  kubectl -n opencode create secret generic opencode-server-secret \
    --from-literal=OPENCODE_SERVER_PASSWORD=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16)

  
  ```
  {{% /notice %}}

  <p> <b>2.prepare</b> `deploy-opencode.yaml` </p>

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
      repoURL: oci://ghcr.io/aaronyang0628/opencode
      targetRevision: 0.20.0
      chart: opencode
      helm:
        values: |
          image:
            repository: ghcr.io/nimbleflux/opencode-docker
            tag: 1.2.26
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
            enabled: true
            storageClass: local-path
            config:
              enabled: false 
            data:
              enabled: true
              size: 1Gi
            workspace:
              enabled: true
              size: 5Gi
            playbook:
              enabled: true
              mountPath: /home/opencode/workspace/playbook
              example:
                enabled: true
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
            enabled: true
            className: nginx
            annotations:
              kubernetes.io/ingress.class: nginx
              cert-manager.io/cluster-issuer: letsencrypt
              nginx.ingress.kubernetes.io/proxy-connect-timeout: "300"
              nginx.ingress.kubernetes.io/proxy-send-timeout: "300"
              nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
              nginx.ingress.kubernetes.io/proxy-body-size: "50m"
              nginx.ingress.kubernetes.io/upstream-keepalive-connections: "50"
              nginx.ingress.kubernetes.io/upstream-keepalive-timeout: "60"
            hosts:
              - host: ops.agent.72602.online
                paths:
                  - path: /
                    pathType: Prefix
            tls:
            - hosts:
              - ops.agent.72602.online
              secretName: ops.agent.72602.online-tls
          globalLabels:
            app.kubernetes.io/part-of: opencode
            environment: production
          bridge:
            enabled: true
            image:
              repository: crpi-wixjy6gci86ms14e.cn-hongkong.personal.cr.aliyuncs.com/ay-dev/opencode-bridge
              tag: "v20260326r4"
            env:
              defaultModel: "openai/gpt-5.3-codex-spark"
              openaiStreamChunkSize: "4"
              openaiStreamChunkDelayMs: "10"
              enableLeadingEchoFilter: "false"
            resources:
              limits:
                cpu: 500m
                memory: 256Mi
              requests:
                cpu: 100m
                memory: 128Mi
            ingress:
              enabled: true
              annotations:
                kubernetes.io/ingress.class: nginx
                cert-manager.io/cluster-issuer: letsencrypt
                nginx.ingress.kubernetes.io/proxy-buffering: "off"
                nginx.ingress.kubernetes.io/proxy-request-buffering: "off"
                nginx.ingress.kubernetes.io/proxy-connect-timeout: "300"
                nginx.ingress.kubernetes.io/proxy-send-timeout: "300"
                nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
                nginx.ingress.kubernetes.io/proxy-body-size: "50m"
                nginx.ingress.kubernetes.io/upstream-keepalive-connections: "50"
                nginx.ingress.kubernetes.io/upstream-keepalive-timeout: "60"
              hosts:
                - host: opencode-bridge.72602.online
                  paths:
                    - path: /
                      pathType: Prefix
              tls:
                - secretName: opencode-bridge-tls
                  hosts:
                    - opencode-bridge.72602.online

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
  argocd app sync argocd/opencode
  ```
  {{% /notice %}}

  <p> <b>4.then you can talk with LLM with rest api</b></p>

  {{% notice style="transparent" %}}
  ```bash
  curl -s "https://opencode-bridge.72602.online/v1/models"
  
  ## {"id":"ses_30a879abeffe6KRC0Rmg4aPrmK","slug":"brave-eagle","version":"1.2.26","projectID":"global","directory":"/home/opencode/workspace","title":"New session - 2026-03-16T07:07:14.113Z","time":{"created":1773644834113,"updated":1773644834113}}
  ```
  {{% /notice %}}

  <p> <b>4.then you can talk with LLM with rest api</b></p>

  {{% notice style="transparent" %}}
  ```bash
  curl -k -X POST https://ops.agent.72602.online/session \
  -H "Content-Type: application/json" \
  -d '{"model": "MiniMaxAI/MiniMax-M2.5"}'
  
  ## {"id":"ses_30a879abeffe6KRC0Rmg4aPrmK","slug":"brave-eagle","version":"1.2.26","projectID":"global","directory":"/home/opencode/workspace","title":"New session - 2026-03-16T07:07:14.113Z","time":{"created":1773644834113,"updated":1773644834113}}
  ```
  {{% /notice %}}

  <p> <b>5.reuse the same session</b></p>

  {{% notice style="transparent" %}}
  ```bash
  curl -k -X POST https://ops.agent.72602.online/session/ses_30a879abeffe6KRC0Rmg4aPrmK/message \
  -H "Content-Type: application/json" \
  -d '{"parts": [{"type": "text", "text": "你好"}]}'

  ## {"info":{"role":"assistant","time":{"created":1773644844131,"completed":1773644848700},"parentID":"msg_cf5788c12001RS4wX3hwMRe0If","modelID":"minimax-m2.5","providerID":"minimax","mode":"build","agent":"build","path":{"cwd":"/home/opencode/workspace","root":"/"},"cost":0,"tokens":{"total":10628,"input":10567,"output":61,"reasoning":0,"cache":{"read":0,"write":0}},"finish":"stop","id":"msg_cf5788c63001hBrorYejcHc1tO","sessionID":"ses_30a879abeffe6KRC0Rmg4aPrmK"},"parts":[{"type":"step-start","id":"prt_cf57899120016WXp4jT4AHeTiG","sessionID":"ses_30a879abeffe6KRC0Rmg4aPrmK","messageID":"msg_cf5788c63001hBrorYejcHc1tO"},{"type":"text","text":"<think>The user said \"你好\" which means \"Hello\" in Chinese. According to the instructions, I should be concise and direct. I should respond briefly without unnecessary preamble. Since this is a simple greeting, I can just respond with a greeting back.\n</think>\n\n你好！有什么可以帮你的吗？","time":{"start":1773644848689,"end":1773644848689},"id":"prt_cf5789913001dUZnoW9w63ThkC","sessionID":"ses_30a879abeffe6KRC0Rmg4aPrmK","messageID":"msg_cf5788c63001hBrorYejcHc1tO"},{"type":"step-finish","reason":"stop","cost":0,"tokens":{"total":10628,"input":10567,"output":61,"reasoning":0,"cache":{"read":0,"write":0}},"id":"prt_cf5789e35001dLGIXJb5WHizMX","sessionID":"ses_30a879abeffe6KRC0Rmg4aPrmK","messageID":"msg_cf5788c63001hBrorYejcHc1tO"}]}
  
  ```
  {{% /notice %}}

 
{{< /tab >}}


{{< tab title="🐙CLI" style="transparent" >}}

  <p> <b>1. following the steps in `https://opencode.ai` </p>
  

  {{% notice style="transparent" %}}
  ```shell
  curl -fsSL https://opencode.ai/install | bash
  ```
  {{% /notice %}}


{{< /tab >}}



{{< /tabs >}}


<p> <b>6.use bridge to manage session</b></p>

<img src="../../../images/content/n8n/opencode-bridge.png" alt="bridge" width="900">



### 🌐Hugo Docs Site

The Hugo documentation site is deployed via ArgoCD on `ops.docs.72602.online` (formerly `port.72602.online`).

{{< tabs groupid="hugo-docs" style="primary" title="Deployment Environment" icon="thumbtack" >}}

{{< tab title="🐙ArgoCD (72602)" style="transparent" >}}
  {{% include "/Installation/SNIPPET/_argo_cd_preliminary.md" %}}

  <p> <b>1.prepare</b> `deploy-hugo-docs.yaml` </p>

  {{% notice style="transparent" %}}
  ```yaml
  kubectl -n argocd apply -f - <<'EOF'
  apiVersion: argoproj.io/v1alpha1
  kind: Application
  metadata:
    name: hugo-docs
    namespace: argocd
  spec:
    project: default
    source:
      repoURL: https://github.com/aaronyang0628/ops-docs.git
      targetRevision: main
      path: .
    destination:
      server: https://kubernetes.default.svc
      namespace: hugo-docs
    syncPolicy:
      syncOptions:
        - CreateNamespace=true
      automated:
        prune: true
        selfHeal: true
  EOF
  ```
  {{% /notice %}}

  <p> <b>2.sync by argocd</b></p>

  {{% notice style="transparent" %}}
  ```bash
  argocd app sync argocd/hugo-docs
  ```
  {{% /notice %}}

{{< /tab >}}

{{< /tabs >}}

### 🤖Multi-Agent System

The opencode deployment includes two specialized agents for cluster and documentation maintenance:

| Agent | Role | Target |
|-------|------|--------|
| `k3s-maintainer` | Cluster operations | k3s cluster health, pod management, node maintenance |
| `doc-maintainer` | Documentation updates | Hugo docs site content, ArgoCD Application updates |

<p> <b>Agent Configuration</b> (applied as ConfigMaps) </p>

{{% notice style="transparent" %}}
```yaml
kubectl -n opencode apply -f - <<'EOF'
apiVersion: v1
kind: ConfigMap
metadata:
  name: k3s-maintainer-config
data:
  opencode.json: |
    {
      "provider": {
        "openai": {
          "options": {
            "baseURL": "https://v2.qixuw.com/v1",
            "apiKey": "sk-ss"
          },
          "models": {
            "gpt-5.3-codex-spark": {
              "name": "GPT-5.3 Codex Spark",
              "limit": { "context": 128000, "output": 32000 }
            }
          }
        }
      },
      "mcp": {
        "k8s-mcp": {
          "type": "remote",
          "url": "http://k8s-mcp.opencode.svc.cluster.local:8080/mcp",
          "enabled": true,
          "timeout": 15000
        }
      },
      "agent": {
        "build": { "options": { "store": false } },
        "plan": { "options": { "store": false } }
      }
    }
EOF
```
{{% /notice %}}

<p> <b>Deploy agents via ArgoCD</b> - each agent runs as a separate opencode server Pod with its own ConfigMap </p>

{{% notice style="transparent" %}}
```yaml
kubectl -n argocd apply -f - <<'EOF'
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: k3s-maintainer
  namespace: argocd
spec:
  project: default
  source:
    repoURL: oci://ghcr.io/aaronyang0628/opencode
    targetRevision: 0.20.0
    chart: opencode
    helm:
      values: |
        image:
          repository: ghcr.io/nimbleflux/opencode-docker
          tag: 1.2.26
        replicaCount: 1
        command: ["opencode"]
        args: ["serve", "--port", "4001", "--hostname", "0.0.0.0"]
        service:
          type: ClusterIP
          port: 4001
        env:
          OPENCODE_PORT: "4001"
        extraVolumes:
          - name: agent-config
            configMap:
              name: k3s-maintainer-config
        extraVolumeMounts:
          - name: agent-config
            mountPath: /home/opencode/.config/opencode/opencode.json
            subPath: opencode.json
        persistence:
          enabled: true
          storageClass: local-path
          config:
            enabled: false
          data:
            enabled: true
            size: 1Gi
          workspace:
            enabled: true
            size: 5Gi
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 2
            memory: 4Gi
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

### ⚡Optimizations

Several optimizations were applied to improve the ArgoCD workflow:

| Optimization | Before | After |
|-------------|--------|-------|
| GitHub proxy for ArgoCD | Direct GitHub access | `ghfast.top` mirror |
| Git repo size | 117 MB | 44 MB |
| ArgoCD sync time | slow (~minutes) | ~7 seconds |

<p> <b>1. GitHub Proxy</b> - configure ArgoCD to use `ghfast.top` for faster OCI/Helm chart pulls </p>

{{% notice style="transparent" %}}
```yaml
# In argocd-cm ConfigMap:
data:
  repositories: |
    - url: oci://ghcr.io
      proxy: https://ghfast.top
```
{{% /notice %}}

<p> <b>2. Repo Size Reduction</b> - cleaned large files and unused assets from the git repository </p>

{{% notice style="transparent" %}}
```bash
# Remove git history and prune
git filter-repo --strip-blobs-bigger-than 1M
git gc --aggressive --prune=now
```
{{% /notice %}}

<p> <b>3. Fast ArgoCD Sync</b> - achieved by combining ServerSideApply, lean manifests, and cached images </p>

{{% notice style="transparent" %}}
```yaml
syncPolicy:
  syncOptions:
    - ServerSideApply=true
```
{{% /notice %}}


### 🛎️FAQ

{{% expand title="Q1: OpenCode Pod runs but API returns 401/403" %}}
**Symptom**
- `curl` to `/session` or bridge endpoint returns unauthorized.

**Check**
```bash
kubectl -n opencode get secret opencode-server-secret -o yaml
kubectl -n opencode get configmap opencode-config -o yaml
kubectl -n opencode logs deploy/opencode --tail=100
```

**Fix**
- Confirm `OPENCODE_SERVER_PASSWORD` secret exists and is mounted correctly.
- Confirm client request carries expected auth configuration.
- Re-apply ConfigMap/Application and sync again.

**Expected**
- Session creation and message requests return successful JSON responses.
{{% /expand %}}

{{% expand title="Q2: Model list is empty or model invocation fails" %}}
**Symptom**
- `/v1/models` returns empty list, or chat request returns provider/model error.

**Check**
```bash
kubectl -n opencode get configmap opencode-config -o jsonpath='{.data.opencode\.json}'
kubectl -n opencode logs deploy/opencode --tail=200
```

**Fix**
- Verify provider `baseURL`, `apiKey`, and model ID in `opencode.json`.
- Ensure selected default model exists in configured provider models.
- Re-apply config and restart workload if needed.

**Expected**
- `/v1/models` shows expected model entries and session message calls succeed.
{{% /expand %}}
