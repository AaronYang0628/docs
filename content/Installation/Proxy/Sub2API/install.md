+++
title = "Install (ArgoCD)"
description = "Use ArgoCD to deploy sub2api in application namespace"
+++

### Preliminary
- ArgoCD 已可访问: `https://argocd.72602.online`
- cert-manager 与 `lets-encrypt` 已就绪
- DNS 已解析: `sub2api.72602.online -> 47.110.67.161`
- PostgreSQL(`database` ns) 可用

### Deployment
{{< tabs title="Deploy" >}}
{{< tab title="Secrets" icon="fa-solid fa-key" >}}

{{% notice style="transparent" %}}
```bash
PG_PASSWORD=$(kubectl -n database get secret postgresql-credentials -o jsonpath='{.data.postgres-password}' | base64 -d)
JWT_SECRET=$(openssl rand -hex 32)
TOTP_KEY=$(openssl rand -hex 32)

kubectl get ns application > /dev/null 2>&1 || kubectl create namespace application

kubectl -n application create secret generic sub2api-auth \
  --from-literal=admin-password='CHANGE_ME_STRONG_PASSWORD' \
  --from-literal=jwt-secret="$JWT_SECRET" \
  --from-literal=totp-encryption-key="$TOTP_KEY" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl -n application create secret generic sub2api-external-postgresql \
  --from-literal=postgres-password="$PG_PASSWORD" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl -n application create secret generic sub2api-redis \
  --from-literal=redis-password='CHANGE_ME_REDIS_PASSWORD' \
  --dry-run=client -o yaml | kubectl apply -f -
```
{{% /notice %}}

{{< /tab >}}
{{< tab title="ArgoCD App" icon="fa-solid fa-rocket" >}}

{{% notice style="transparent" %}}
```bash
ARGOCD_PASS=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)
argocd login --insecure --username admin argocd.72602.online --password $ARGOCD_PASS

kubectl apply -f /home/aaron/Ops/docs/manifests/application/sub2api-argocd.yaml
argocd app sync sub2api
argocd app wait sub2api --health --timeout 300
```
{{% /notice %}}

{{< /tab >}}
{{< /tabs >}}

### Verify

```bash
argocd app get sub2api
kubectl -n application get pods,svc,ingress
kubectl -n application get certificate,certificaterequest,order,challenge
curl -vkI https://sub2api.72602.online
```
