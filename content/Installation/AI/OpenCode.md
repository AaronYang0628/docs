+++
title = 'OpenCode / ops-agent'
date = 2024-03-07T15:00:59+08:00
weight = 14
+++

### 🚀Installation

{{< tabs groupid="xxxx" style="primary" title="Install By" icon="thumbtack" >}}

{{< tab title="🐙ArgoCD (72602)" style="transparent" >}}
  {{% include "/Installation/SNIPPET/_argo_cd_preliminary.md" %}}

  <p> <b>1.prepare secrets</b> </p>

  ```shell
  kubectl -n application create secret generic opencode-secrets \
    --from-literal=deepseek-api-key='<your-deepseek-api-key>'

  kubectl -n application create secret generic opencode-git-ssh \
    --from-file=ssh-privatekey=<your-github-deploy-key>

  kubectl -n application create secret generic opencode-oauth2-secrets \
    --from-literal=client-id='<github-oauth-client-id>' \
    --from-literal=client-secret='<github-oauth-client-secret>' \
    --from-literal=cookie-secret=$(python3 -c "import secrets; print(secrets.token_hex(16))")
  ```

  <p> <b>2.deploy via ArgoCD</b> </p>

  ```shell
  kubectl -n argocd apply -f https://raw.githubusercontent.com/AaronYang0628/docs/main/argocd.app-opencode.yaml
  ```

  <p> <b>3.verify</b> </p>

  ```shell
  argocd app get ops-agent
  kubectl -n application get pods -l app=ops-agent
  ```

{{< /tab >}}

{{< /tabs >}}

### 🔐Auth (oauth2-proxy)

ops-agent 通过 oauth2-proxy sidecar 实现 GitHub OAuth 登录：

```
用户浏览器 → ops.agent.72602.online:443
              ↓ Ingress (TLS)
              ↓ oauth2-proxy (sidecar :4180)
              ↓ GitHub OAuth login (2FA enabled)
              ↓ opencode web (sidecar :3000)
                ├── 主 agent
                ├── 72602-k3s-maintainer（kubectl，cluster-admin）
                └── hugo-doc-maintainer（git push）
```

### 🤖Multi-Agent System

当前 72602 集群预置了两个 agent：

| Agent | 角色 | 权限 |
|---|---|---|
| 72602-k3s-maintainer | 集群 SRE | kubectl cluster-admin |
| hugo-doc-maintainer | 文档维护 | 读写 `content/` + git push |

Agent 定义见仓库 `.opencode/agents/` 目录，通过 ConfigMap `ops-agent-config` 挂载到容器。

### ⚙️Configuration

配置文件 `~/.config/opencode/opencode.json` 由以下方式生成：

- **ConfigMap** `ops-agent-config`: 非敏感配置（provider、baseURL、models）
- **Secret** `opencode-secrets`: API key（`DEEPSEEK_API_KEY`）
- **入口点脚本**: 用 sed 替换 `___INJECT_FROM_ENV___` 占位符，写入可写目录

配置项示例：
```yaml
provider:
  openai:
    options:
      baseURL: https://sub2api.72602.online/v1
      apiKey: ___INJECT_FROM_ENV___   # 运行时替换
    models:
      deepseek-v4-flash: { ... }
      deepseek-v4-pro: { ... }
```
