+++
title = 'Apply And Sync Argocd APP'
date = 2025-03-07T15:00:59+08:00
weight = 10
+++


```yaml
name: apply-and-sync-app
run-name: ${{ gitea.actor }} is going to sync an sample argocd app 🚀
on: [push]

jobs:
  sync-argocd-app:
    runs-on: ubuntu-latest
    steps:
      - name: Sync App
        uses: AaronYang0628/apply-and-sync-argocd@v1.0.6
        with:
          argocd-server: '192.168.100.125:30443'
          argocd-token: ${{ secrets.ARGOCD_TOKEN }}
          application-yaml-path: "environments/ops/argocd/operator.app.yaml"
```
