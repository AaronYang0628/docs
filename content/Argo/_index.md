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

- relogin
```shell
ARGOCD_PASS=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)
MASTER_IP=$(kubectl get nodes --selector=node-role.kubernetes.io/control-plane -o jsonpath='{$.items[0].status.addresses[?(@.type=="InternalIP")].address}')
argocd login --insecure --username admin $MASTER_IP:30443 --password $ARGOCD_PASS
```

- force delete
```shell
argocd app terminate-op <$>
```
