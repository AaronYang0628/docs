+++
title = 'CICD'
date = 2025-03-07T15:00:59+08:00
weight = 30
+++

### Articles
{{%children depth="999" description="false" showhidden="true" %}}

### FAQ

{{% expand title="ArgoCD sync 报 'context deadline exceeded'" %}}
**现象**：`argocd app sync` 一直卡住，最终报 `context deadline exceeded`。

**原因**：ArgoCD repo server git clone 超时（国内网络访问 GitHub 慢）。

**解法**：
1. 配置 GitHub 代理加速：
   ```bash
   kubectl -n argocd exec deploy/argo-cd-argocd-repo-server -- sh -c '
     cat > /tmp/gitconfig << "EOF"
[url "https://ghfast.top/https://github.com/"]
	insteadOf = https://github.com/
[http]
	postBuffer = 2g
	version = HTTP/1.1
	lowSpeedLimit = 0
	lowSpeedTime = 999
[core]
	deltaBaseCacheLimit = 1g
EOF'
   ```
2. 设置 `NO_PROXY` 加上 `ghfast.top`：
   ```bash
   kubectl -n argocp set env deploy/argo-cd-argocd-repo-server NO_PROXY="...,ghfast.top"
   kubectl -n argocp set env deploy/argo-cd-argocd-repo-server GIT_CONFIG_GLOBAL=/tmp/gitconfig
   ```
3. 或在集群内搭 Git 镜像（Gitea），ArgoCD 指向内网。
{{% /expand %}}

{{% expand title="ArgoCD sync hook Job 一直 Running 不完成" %}}
**现象**：以 Job 作为 Sync hook 的 App，Job 长时间处于 Running 状态。

**原因**：Job 内的 init container 或 container 执行受阻。

**排查**：
```bash
# 查看 Job pod 状态
kubectl -n <namespace> get pods -l job-name=<job-name>
# 查看 init container 日志
kubectl -n <namespace> logs <pod-name> -c <init-container-name>
```

**常见解决**：
- Init container 拉代码超时 → 同上 Git 加速方案
- Job 容器权限不足 → 检查 ServiceAccount / PSP
{{% /expand %}}

{{% expand title="ArgoCD Application 状态显示 Unknown" %}}
**原因**：ArgoCD repo server 无法生成 manifest（网络/超时/语法错误）。

**排查步骤**：
```bash
# 查看具体错误
kubectl -n argocd get application <app-name> -o json | jq .status.conditions

# 重启 repo server 清理缓存
kubectl -n argocd rollout restart deploy/argo-cd-argocd-repo-server

# 手动触发刷新
argocd app sync <app-name>
```
{{% /expand %}}

{{% expand title="Helm chart 推送到 OCI 仓库" %}}
```bash
# 登录
helm registry login ghcr.io -u <username>

# 打包
helm package ./my-chart

# 推送
helm push my-chart-0.1.0.tgz oci://ghcr.io/<username>/helm-charts
```

**拉取 OCI 仓库**：
```bash
helm pull oci://ghcr.io/<username>/helm-charts/my-chart --version 0.1.0
```
{{% /expand %}}
