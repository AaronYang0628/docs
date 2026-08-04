+++
title = "UptimeKuma"
+++

### Web Page
[<i class="fa-solid fa-link"></i> uptime-kuma (https://uptime.72602.space)](https://uptime.72602.space)


### Deployment
{{< tabs groupid="uptime-kuma-deployment" title="Depoly For" >}}
{{< tab title="Production" icon="fa-solid fa-rocket" >}}

{{% notice style="transparent" %}}
```bash
kubectl get namespace monitor > /dev/null 2>&1 || kubectl create namespace monitor
kubectl -n monitor apply -f manifests/uptimekuma/
```
{{% /notice %}}

Notes:
- Uptime Kuma is exposed only through k8s ingress (`uptime.72602.space`).
- Do not bind ECS host ports 80/443 for local reverse proxies, they are reserved for forwarding to miniPC ingress.

{{< /tab >}}
{{< /tabs >}}
