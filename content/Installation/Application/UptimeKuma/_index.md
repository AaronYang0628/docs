+++
title = "UptimeKuma"
+++

### Web Page
[<i class="fa-solid fa-link"></i> uptime-kuma (https://uptime.72602.online)](https://uptime.72602.online)


### Deployment
{{< tabs  title="Depoly For" >}}
{{< tab title="Production" icon="fa-solid fa-rocket" >}}

{{% notice style="transparent" %}}
```
kubectl get namespace monitor > /dev/null 2>&1 || kubectl create namespace monitor
kubectl -n argocd apply -f manifests/uptimekuma/uptimekuma.values.yaml
```
{{% /notice %}}

Notes:
- Uptime Kuma is exposed only through k8s ingress (`uptime.72602.online`).
- Do not bind ECS host ports 80/443 for local reverse proxies, they are reserved for forwarding to miniPC ingress.

{{< /tab >}}
{{< /tabs >}}
