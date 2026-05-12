+++
title = 'Git'
date = 2025-03-07T15:00:59+08:00
weight = 70
+++

### Articles
{{%children depth="999" description="false" showhidden="true" %}}

### FAQ

{{% expand title="GitHub push 报 'Permission denied (publickey)'" %}}
**原因**：本地 SSH key 未注册到 GitHub。

**解法**：
```bash
# 1. 查看本地公钥
cat ~/.ssh/id_ed25519.pub
# 2. 复制到 GitHub → Settings → SSH and GPG keys → New SSH key
# 3. 测试连接
ssh -T git@github.com
```
{{% /expand %}}

{{% expand title="GitHub Deploy Key 是什么？怎么用？" %}}
Deploy Key 是绑定到单个仓库的 SSH key，只对该仓库有读写权限。

**生成**：
```bash
ssh-keygen -t ed25519 -f opencode-deploy-key -C "my-repo-deploy"
```

**配置**：
1. 公钥添加到 GitHub repo → Settings → Deploy keys → Add deploy key（勾 Write access）
2. 私钥用于 Git 操作：
   ```bash
   GIT_SSH_COMMAND="ssh -i /path/to/opencode-deploy-key" git push
   ```

**用途**：常用于 CI/CD 或容器内 Git 操作，权限范围最小。
{{% /expand %}}

{{% expand title="GitHub Actions 报错 'The request URL returned error 403'" %}}
**原因**：GitHub token 权限不足或过期。

**解法**：
1. 去 GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) 重新生成
2. 确保勾选了 `repo` 和 `workflow` 权限
3. 更新仓库的 Secrets → 替换旧的 token
{{% /expand %}}

{{% expand title="Git submodule 更新失败" %}}
**现象**：`git submodule update --init --depth 1` 卡住或报错。

**原因**：子模块仓库访问慢或不存在。

**解法**：
```bash
# 使用代理
git -c http.proxy=http://proxy:port submodule update --init

# 或换源（如使用 ghproxy）
git submodule set-url themes/my-theme https://ghproxy.org/https://github.com/xxx/my-theme.git
git submodule update --init
```
{{% /expand %}}

{{% expand title="国内 git clone 太慢怎么办" %}}
**方案一：使用 ghfast.top 代理**
```bash
git clone https://ghfast.top/https://github.com/user/repo.git
```

**方案二：配置 URL 重写（全局生效）**
```bash
git config --global url."https://ghfast.top/https://github.com/".insteadOf "https://github.com/"
```

**方案三：使用 Gitee 镜像**
1. 在 Gitee 上 import 目标仓库
2. 从 Gitee clone（速度很快）
{{% /expand %}}
