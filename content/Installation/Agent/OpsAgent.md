+++
title = 'OpsAgent'
date = 2024-03-07T15:00:59+08:00
weight = 151
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

### 🔐Auth (oauth2-proxy) & Credential Flow

ops-agent 通过 oauth2-proxy sidecar 实现 GitHub OAuth 登录，LLM API 凭据通过 `auth.json` 注入：

```
用户浏览器 → ops.agent.72602.online:443
              ↓ Ingress (TLS)
              ↓ oauth2-proxy (sidecar :4180)
              ↓ GitHub OAuth login (2FA enabled)
              ↓ opencode web (sidecar :3000)
                ├── 主 agent
                ├── 72602-k3s-maintainer（kubectl，cluster-admin）
                └── hugo-doc-maintainer（git push）

凭据注入：
  Secret opencode-secrets → env OPS_MODEL_SECRET
    → entrypoint 写入 ~/.local/share/opencode/auth.json
      → provider "openai" → sub2api.72602.online/v1
```

> **注意**：ConfigMap 中 **不包含** `apiKey`。密钥仅通过 `auth.json` 注入，provider 名必须与 ConfigMap 中的 provider 名一致（均为 `"openai"`）。

### 🤖Multi-Agent System

当前 72602 集群预置了两个 agent：

| Agent | 角色 | 权限 |
|---|---|---|
| 72602-k3s-maintainer | 集群 SRE | kubectl cluster-admin |
| hugo-doc-maintainer | 文档维护 | 读写 `content/` + git push |

Agent 定义见仓库 `.opencode/agents/` 目录，通过 ConfigMap `ops-agent-config` 挂载到容器。

### ⚙️Configuration

opencode 配置分两层：

| 层级 | 文件 | 内容 | 注入方式 |
|------|------|------|----------|
| **Workspace** | ConfigMap → `/app/repo-baked/.opencode/opencode.json` | provider 定义、models、baseURL（无 apiKey） | ConfigMap 挂载（只读） |
| **Credentials** | entrypoint → `~/.local/share/opencode/auth.json` | API key，provider 名 `"openai"` | entrypoint 从 `OPS_MODEL_SECRET` 写入 |

> **设计原则**：ConfigMap 不含 apiKey，避免 workspace 级配置覆盖用户级凭据注入。API key 仅通过 `auth.json` 按 provider 名注入，与 ConfigMap 中的 `"openai"` provider 匹配。

ConfigMap 示例（`manifests/ops-agent/configmap.yaml`）：
```yaml
provider:
  openai:
    options:
      baseURL: https://sub2api.72602.online/v1
      # 注意：不再包含 apiKey 字段！
    models:
      deepseek-v4-flash:
        limit: { context: 400000, output: 128000 }
        variants: { low: {}, medium: {}, high: {} }
      deepseek-v4-pro:
        limit: { context: 1050000, output: 128000 }
        variants: { low: {}, medium: {}, high: {}, xhigh: {} }
model: openai/deepseek-v4-flash
small_model: openai/deepseek-v4-flash
```

auth.json 由 entrypoint 生成（`docker-entrypoint.sh`）：
```json
{
  "openai": {
    "type": "api",
    "key": "${OPS_MODEL_SECRET}"
  }
}
```

### 🔧 72602 变更记录（2026-05-14）

#### 补充修复（2026-05-14 #2）

##### 现象
1. 网页进入 ops-agent 后对话持续报错：`Unauthorized: Invalid API key`。
2. 直接 curl sub2api 可通，但 opencode 会话请求仍 401。
3. 会话日志显示请求命中 `gpt-5.3-chat-latest`（OpenAI 内置默认模型），非配置的 `deepseek-v4-flash`。

##### 根因
1. **ConfigMap 中的 `apiKey` 占位符被 workspace 配置回读**：ConfigMap 挂载到 `/app/repo-baked/.opencode/opencode.json`，opencode 将其作为 workspace 级配置加载。其中 `apiKey: ___INJECT_FROM_ENV___` 覆盖了 entrypoint 注入到 `~/.config/opencode/opencode.json` 的真实密钥 → 请求带 `Bearer ___INJECT_FROM_ENV___` → 401。
2. **`auth.json` provider 名不匹配**：原 entrypoint 创建的 `auth.json` 使用 `"deepseek"` provider，但 ConfigMap 定义的是 `"openai"` provider，两者不互通。
3. **缺少 `model` / `small_model` 字段**（历史版本）：ConfigMap 一度缺失这两个字段，导致 opencode 回退到 built-in 默认模型 `gpt-5.3-chat-latest`。

##### 操作步骤
1. **ConfigMap 移除 `apiKey`**：仅保留 `baseURL` + models，密钥完全由 `auth.json` 注入，杜绝 workspace 配置覆盖。
2. **`auth.json` provider 名修正**：`"deepseek"` → `"openai"`，与 ConfigMap provider 名一致。
3. **Deployment 添加 `command` override**：临时内联 entrypoint 逻辑（绕过旧镜像），确保 `auth.json` 正确生成。待 Docker 镜像重建后可移除。
4. **移除 git-sync 容器**：回退到镜像内置 repo 方式，简化运维。
5. **补回 `model` / `small_model` 字段**到 ConfigMap。

##### 验证结果
```bash
# Pod 内直连测试
kubectl exec -n application deploy/ops-agent -c opencode -- \
  curl -s -X POST http://localhost:3000/session/:id/message \
  -H 'Content-Type: application/json' \
  -d '{"parts":[{"type":"text","text":"say hello"}],"noReply":false}'
# 预期：model=deepseek-v4-flash, HTTP 200, response 正常
```

##### 待完成
- [ ] 重建 Docker 镜像（含修正后的 `docker-entrypoint.sh`）
- [ ] 移除 Deployment 中的 `command` override，恢复 `ENTRYPOINT` 方式

#### 初始修复（2026-05-14 #1）⚠️ 已废弃

> 以下操作已回退。git-sync 方案导致密钥注入路径混乱，最终采用上述补充修复方案。

<details>
<summary>展开原始记录</summary>

##### 现象
1. 网页进入 ops-agent 后对话报错：`Unauthorized: Invalid API key`。
2. ops-docs 内容未跟随 GitHub main 及时更新。
3. 直接 `kubectl apply` 会被 ArgoCD `selfHeal` 回滚，导致线上反复恢复旧配置。

##### 根因
1. 线上仍使用旧变量名与旧启动逻辑，密钥未按统一变量注入。
2. 仓库工作目录依赖镜像内置内容，缺少持续同步机制。
3. ArgoCD 的源是 GitHub main；未提交到 main 的集群手改会被自动回滚。

##### 操作步骤
1. 统一模型密钥变量：`OPS_MODEL_SECRET`（Secret 注入 env）。
2. `opencode.json` 继续由 ConfigMap 挂载，并由 entrypoint 用 `OPS_MODEL_SECRET` 替换 `___INJECT_FROM_ENV___`。
3. Deployment 增加：
   - `git-sync-init`（启动一次拉取 main）
   - `git-sync` sidecar（周期 30s 同步 main）
   - 将工作目录指向 `/app/repo-baked/repo`
4. GitOps 正确流程：**先在分支提交 -> 验证 -> 合并 main -> 由 ArgoCD 自动部署**。

##### 回滚步骤
```bash
kubectl -n application rollout undo deploy/ops-agent
```

##### 验证结果
```bash
kubectl -n application get pod -l app=ops-agent -o wide
kubectl -n application logs deploy/ops-agent -c git-sync --tail=100
kubectl -n application logs deploy/ops-agent -c opencode --tail=100
```

预期：
1. Pod 包含 `git-sync` 容器并持续同步。
2. 对话不再出现 `Unauthorized: Invalid API key`。
3. GitHub main 更新后，ops-docs 页面内容可同步更新。

</details>
