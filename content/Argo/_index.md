+++
title = '🐙Argo (CI/CD)'
date = 2024-03-07T15:00:59+08:00
weight = 11
+++

## Content
{{%children depth="999" description="false" showhidden="true" %}}


### CheatSheets
- decode passd
```shell
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

- force delete
```shell
argocd app terminate-op <$>
```