+++
title = 'Git / GitLab'
date = 2026-05-12T15:00:59+08:00
weight = 80
+++

### GitLab

#### Backup GitLab via Omnibus

```bash
# 创建备份（Omnibus 安装）
sudo gitlab-rake gitlab:backup:create

# 备份文件位置
ls -la /var/opt/gitlab/backups/

# 恢复
sudo gitlab-rake gitlab:backup:restore BACKUP=<timestamp>
```

#### Backup GitLab on Kubernetes

```bash
# 备份数据库
kubectl -n gitlab exec deploy/gitlab -- gitlab-backup create

# 复制备份到本地
kubectl -n gitlab cp gitlab-pod:/var/opt/gitlab/backups/<backup-file> ./
```

### GitHub (General)

当前项目托管在 GitHub 上，数据安全由 GitHub 保障。

如需额外备份：

```bash
# 备份所有仓库
gh repo list --limit 100 --json nameWithOwner -q '.[].nameWithOwner' | \
  while read repo; do
    git clone --mirror "https://github.com/$repo" "backups/$repo.git"
  done
```
