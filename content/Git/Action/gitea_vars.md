+++
title = 'Gitea Variables'
date = 2024-03-07T15:00:59+08:00
weight = 71
+++


### Preset Variables

| 变量名称示例                | 说明 / 用途                                                     |
| --------------------- | ------------------------------------------------------------------- |    
| `gitea.actor`         | 触发 workflow 的用户的用户名。([docs.gitea.com][1])                   |
| `gitea.event_name`    | 事件名称，比如 `push`、`pull_request` 等。([docs.gitea.com][1])       |
| `gitea.ref`           | 被触发的 Git 引用（branch/tag/ref）名称。([docs.gitea.com][1])        |
| `gitea.repository`    | 仓库标识，一般是 `owner/name`。([docs.gitea.com][1])                  |
| `gitea.workspace`     | 仓库被 checkout 到 runner 上的工作目录路径。([docs.gitea.com][1])      |

### Common Variables
| 变量名称示例                | 说明 / 用途                                                     |
| --------------------- | ------------------------------------------------------------------- |   
| `runner.os`           | Runner 所在的操作系统环境，比如 `ubuntu-latest`。([docs.gitea.com][1])           |
| `job.status`          | 当前 job 的状态（例如 success 或 failure）。([docs.gitea.com][1])                 |
| `env.xxxx`            | 自定义配置变量，在用户／组织／仓库层定义，统一以大写形式引用。([docs.gitea.com][2])  |
| `secrets.XXXX`        | 存放敏感信息的密钥，同样可以在用户／组织／仓库层定义。([docs.gitea.com][3])         |

[1]: https://docs.gitea.com/usage/actions/quickstart?utm_source=chatgpt.com "Quick Start | Gitea Documentation"
[2]: https://docs.gitea.com/usage/actions/actions-variables?utm_source=chatgpt.com "Variables"
[3]: https://docs.gitea.com/1.24/usage/actions/secrets?utm_source=chatgpt.com "Secrets"

### Sample
```yaml
name: Gitea Actions Demo
run-name: ${{ gitea.actor }} is testing out Gitea Actions 🚀
on: [push]

env:
    author: gitea_admin
jobs:
  Explore-Gitea-Actions:
    runs-on: ubuntu-latest
    steps:
      - run: echo "🎉 The job was automatically triggered by a ${{ gitea.event_name }} event."
      - run: echo "🐧 This job is now running on a ${{ runner.os }} server hosted by Gitea!"
      - run: echo "🔎 The name of your branch is ${{ gitea.ref }} and your repository is ${{ gitea.repository }}."
      - name: Check out repository code
        uses: actions/checkout@v4
      - run: echo "💡 The ${{ gitea.repository }} repository has been cloned to the runner."
      - run: echo "🖥️ The workflow is now ready to test your code on the runner."
      - name: List files in the repository
        run: |
          ls ${{ gitea.workspace }}
      - run: echo "🍏 This job's status is ${{ job.status }}."
```
### Result
```text
🎉 The job was automatically triggered by a `push` event.

🐧 This job is now running on a `Linux` server hosted by Gitea!

🔎 The name of your branch is `refs/heads/main` and your repository is `gitea_admin/data-warehouse`.

💡 The `gitea_admin/data-warehouse` repository has been cloned to the runner.

🖥️ The workflow is now ready to test your code on the runner.

    Dockerfile  README.md  environments  pom.xml  src  templates

🍏 This job's status is `success`.
```