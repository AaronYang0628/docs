+++
title = 'OpenCode + MiniMax'
date = 2026-03-07T15:00:59+08:00
weight = 10
+++



### Opencode Config
```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "minimax": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "MiniMax M2.5",
      "options": {
        "baseURL": "http://10.200.92.41:31551/v1",
        "apiKey": "sk-x"
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
```

### K8s Manifest
```shell
kubectl -n opencode apply -f - <<'EOF'
apiVersion: v1
kind: ConfigMap
metadata:
  name: opencode-config
  namespace: opencode
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
            "apiKey": "sk-s"
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