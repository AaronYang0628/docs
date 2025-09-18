+++
title = '🐸Git Action'
date = 2024-03-07T15:00:59+08:00
weight = 71
+++

## Content
{{%children depth="999" description="false" showhidden="true" %}}


### Context Variables

| 上下文 / 类型            | 变量名称示例                | 说明 / 用途                                                   |
| ------------------- | --------------------- | --------------------------------------------------------- |
| `gitea` 上下文         | `gitea.actor`         | 触发 workflow 的用户。([docs.gitea.com][1])                     |
|                     | `gitea.event_name`    | 事件名称，比如 `push`、`pull_request` 等。([docs.gitea.com][1])     |
|                     | `gitea.ref`           | 被触发的 Git 引用（branch/tag/ref）名称。([docs.gitea.com][1])       |
|                     | `gitea.repository`    | 仓库标识，一般是 `owner/name`。([docs.gitea.com][1])               |
|                     | `gitea.workspace`     | 仓库被 checkout 到 runner 上的工作目录路径。([docs.gitea.com][1])      |
| 通用 & runner/job 上下文 | `runner.os`           | Runner 所在的操作系统环境，比如 `ubuntu-latest`。([docs.gitea.com][1]) |
|                     | `job.status`          | 当前 job 的状态（例如 success 或 failure）。([docs.gitea.com][1])    |
| `vars` 上下文          | `vars.VARIABLE_NAME`  | 自定义配置变量，在用户／组织／仓库层定义，统一以大写形式引用。([docs.gitea.com][2])      |
| `secrets` 上下文       | `secrets.SECRET_NAME` | 存放敏感信息的密钥，同样可以在用户／组织／仓库层定义。([docs.gitea.com][3])          |

[1]: https://docs.gitea.com/usage/actions/quickstart?utm_source=chatgpt.com "Quick Start | Gitea Documentation"
[2]: https://docs.gitea.com/usage/actions/actions-variables?utm_source=chatgpt.com "Variables"
[3]: https://docs.gitea.com/1.24/usage/actions/secrets?utm_source=chatgpt.com "Secrets"

