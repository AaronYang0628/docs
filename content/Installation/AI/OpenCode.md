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

### 🔧 72602 变更记录（2026-05-14）

#### 现象
1. 网页进入 ops-agent 后对话报错：`Unauthorized: Invalid API key`。
2. ops-docs 内容未跟随 GitHub main 及时更新。
3. 直接 `kubectl apply` 会被 ArgoCD `selfHeal` 回滚，导致线上反复恢复旧配置。

#### 根因
1. 线上仍使用旧变量名与旧启动逻辑，密钥未按统一变量注入。
2. 仓库工作目录依赖镜像内置内容，缺少持续同步机制。
3. ArgoCD 的源是 GitHub main；未提交到 main 的集群手改会被自动回滚。

#### 操作步骤
1. 统一模型密钥变量：`OPS_MODEL_SECRET`（Secret 注入 env）。
2. `opencode.json` 继续由 ConfigMap 挂载，并由 entrypoint 用 `OPS_MODEL_SECRET` 替换 `___INJECT_FROM_ENV___`。
3. Deployment 增加：
   - `git-sync-init`（启动一次拉取 main）
   - `git-sync` sidecar（周期 30s 同步 main）
   - 将工作目录指向 `/app/repo-baked/repo`
4. GitOps 正确流程：**先在分支提交 -> 验证 -> 合并 main -> 由 ArgoCD 自动部署**。

#### 回滚步骤
```bash
kubectl -n application rollout undo deploy/ops-agent
```

#### 验证结果
```bash
kubectl -n application get pod -l app=ops-agent -o wide
kubectl -n application logs deploy/ops-agent -c git-sync --tail=100
kubectl -n application logs deploy/ops-agent -c opencode --tail=100
```

预期：
1. Pod 包含 `git-sync` 容器并持续同步。
2. 对话不再出现 `Unauthorized: Invalid API key`。
3. GitHub main 更新后，ops-docs 页面内容可同步更新。
