+++
title = 'Github Variables'
date = 2024-03-07T15:00:59+08:00
weight = 72
+++

### Context Variables

| 变量名称示例                | 说明 / 用途                                                     |
| --------------------- | ------------------------------------------------------------------- |    
| `github.actor`         | 触发 workflow 的用户的用户名。([docs.gitea.com][1])                   |
| `github.event_name`    | 事件名称，比如 `push`、`pull_request` 等。([docs.gitea.com][1])       |
| `github.ref`           | 被触发的 Git 引用（branch/tag/ref）名称。([docs.gitea.com][1])        |
| `github.repository`    | 仓库标识，一般是 `owner/name`。([docs.gitea.com][1])                  |
| `github.workspace`     | 仓库被 checkout 到 runner 上的工作目录路径。([docs.gitea.com][1])      |
| `env.xxxx`            | 在workflow中定义的变量，比如 `${{ env.xxxx }}`                         |
| `secrets.XXXX`        | 通过 `Settings` -> `Actions` -> `Secrets and variables`  创建的密钥。 |