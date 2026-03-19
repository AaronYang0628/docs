+++
title = 'Windows'
date = 2026-03-07T15:00:59+08:00
weight = 10
+++


### PowerShell
```shell
$env:CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC="1"
$env:ANTHROPIC_BASE_URL="https://v2.qixuw.com"
$env:ANTHROPIC_AUTH_TOKEN="sk-sss" # Replace with your API key
claude
```

### One Line Command
```shell
$env:CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC="1"; $env:ANTHROPIC_BASE_URL="https://v2.qixuw.com"; $env:ANTHROPIC_AUTH_TOKEN="sk-sss"; claude
```

### Save to Environment Variables
```shell
[System.Environment]::SetEnvironmentVariable("ANTHROPIC_BASE_URL","https://v2.qixuw.com","User")
[System.Environment]::SetEnvironmentVariable("ANTHROPIC_AUTH_TOKEN","sk-sss","User") # Replace!
[System.Environment]::SetEnvironmentVariable("CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC","1","User")
```