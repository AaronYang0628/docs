+++
tags = ["Homepage"]
title = 'Install Homepage'
date = 2025-10-07T15:00:59+08:00
weight = 80
+++


Offical Documentation: [https://gethomepage.dev/](https://gethomepage.dev/)

### Installation

{{< tabs groupid="prometheus" style="primary" title="Install By" icon="thumbtack" >}}

{{< tab title="Helm" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  2. Helm has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>

  <p> <b>1.install chart directly</b></p>

  {{% notice style="transparent" %}}
  ```bash
  helm install homepage oci://ghcr.io/m0nsterrr/helm-charts/homepage
  ```
  {{% /notice %}}

  <p> <b>2.you can modify the values.yaml and re-install</b></p>
  {{% resources title="Related **values** files" pattern=".*\.(yaml|yml)" /%}}
  {{% notice style="transparent" %}}
  ```bash
  helm install homepage oci://ghcr.io/m0nsterrr/helm-charts/homepage -f homepage.values.yaml
  ```
  {{% /notice %}}

  {{% notice style="important" title="Using Mirror" %}} 
  ```shell
  helm repo add ay-helm-mirror https://aaronyang0628.github.io/helm-chart-mirror/charts \
    && helm install ay-helm-mirror/homepage  --generate-name --version 4.2.0
  ```
  for more information, you can check 🔗[https://aaronyang0628.github.io/helm-chart-mirror/](https://aaronyang0628.github.io/helm-chart-mirror/)
  {{% /notice %}}

{{< /tab >}}

{{< tab title="ArgoCD" style="transparent">}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/kubernetes/cluster/index.html" target="_blank">link</a> </p></br>
  2. ArgoCD has installed, if not check 🔗<a href="/docs/Installation/cicd/argocd/index.html" target="_blank">link</a> </p></br>
  3. Helm binary has installed, if not check 🔗<a href="/docs/Installation/binary/helm/index.html" target="_blank">link</a> </p></br>
  4. Ingres has installed on argoCD, if not check 🔗<a href="/docs/Installation/networking/ingress/index.html" target="_blank">link</a> </p></br>

  <p> <b>1.prepare</b> `homepage.yaml` </p>

  {{% notice style="transparent" %}}
  ```yaml
  kubectl -n argocd apply -f - << EOF
    apiVersion: argoproj.io/v1alpha1
    kind: Application
    metadata:
      name: homepage
    spec:
      syncPolicy:
        syncOptions:
          - CreateNamespace=true
          - ServerSideApply=true
      project: default
      source:
        repoURL: oci://ghcr.io/m0nsterrr/helm-charts/homepage
        chart: homepage
        targetRevision: 4.2.0
        helm:
          releaseName: homepage
          values: |
            image:
              registry: m.daocloud.io/ghcr.io
              repository: gethomepage/homepage
              pullPolicy: IfNotPresent
              tag: "v1.5.0"
            config:
              allowedHosts: 
              - "home.72602.online"
            ingress:
              enabled: true
              ingressClassName: "nginx"
              annotations:
                kubernetes.io/ingress.class: nginx
              hosts:
                - host: home.72602.online
                  paths:
                    - path: /
                      pathType: ImplementationSpecific
            resources:
              limits:
                cpu: 500m
                memory: 512Mi
              requests:
                cpu: 100m
                memory: 128Mi
      destination:
        server: https://kubernetes.default.svc
        namespace: monitor
  EOF
  ```
  {{% /notice %}}

  <p> <b>3.sync by argocd</b></p>

  {{% notice style="transparent" %}}
  ```bash
  argocd app sync argocd/homepage
  ```
  {{% /notice %}}


  <p> <b>5.check the web browser</b></p>

  {{% notice style="transparent" %}}
  ```bash
  K8S_MASTER_IP=$(kubectl get nodes --selector=node-role.kubernetes.io/control-plane -o jsonpath='{$.items[0].status.addresses[?(@.type=="InternalIP")].address}')
  echo "$K8S_MASTER_IP home.72602.online" >> /etc/hosts
  ```
  {{% /notice %}}


{{< /tab >}}


{{< tab title="Docker" style="default" >}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/kubernetes/cluster/index.html" target="_blank">link</a> </p></br>
  2. Docker has installed, if not check 🔗<a href="/docs/Installation/container/docker/index.html" target="_blank">link</a> </p></br>
  
  {{< tabs groupid="tabs-example-language" >}}
    {{% tab title="shell" %}}
  ```bash
  docker run -d \
  --name homepage \
  -e HOMEPAGE_ALLOWED_HOSTS=47.110.67.161:3000 \
  -e PUID=1000 \
  -e PGID=1000 \
  -p 3000:3000 \
  -v /root/home-site/static/icons:/app/public/icons  \
  -v /root/home-site/content/Ops/HomePage/config:/app/config \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  --restart unless-stopped \
  ghcr.io/gethomepage/homepage:v1.5.0
  ```
    {{% /tab %}}
  {{< /tabs >}}

{{< /tab >}}

{{< tab title="Podman" style="default" >}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/kubernetes/cluster/index.html" target="_blank">link</a> </p></br>
  2. Podman has installed, if not check 🔗<a href="/docs/Installation/container/podman/index.html" target="_blank">link</a> </p></br>
  
  {{< tabs groupid="tabs-example-language" >}}
    {{% tab title="shell" %}}
  ```bash
  podman run -d \
  --name homepage \
  -e HOMEPAGE_ALLOWED_HOSTS=127.0.0.1:3000 \
  -e PUID=1000 \
  -e PGID=1000 \
  -p 3000:3000 \
  -v /root/home-site/static/icons:/app/public/icons \
  -v /root/home-site/content/Ops/HomePage/config:/app/config \
  --restart unless-stopped \
  ghcr.io/gethomepage/homepage:v1.5.0
  ```
    {{% /tab %}}
  {{< /tabs >}}

{{< /tab >}}

{{< /tabs >}}



### FAQ

{{% expand title="Q1: Show me almost **endless** possibilities" %}}
You can add standard markdown syntax:

- multiple paragraphs
- bullet point lists
- _emphasized_, **bold** and even **_bold emphasized_** text
- [links](https://example.com)
- etc.

```plaintext
...and even source code
```

> the possibilities are endless (almost - including other shortcodes may or may not work)
{{% /expand %}}


{{% expand title="Q2: Show me almost **endless** possibilities" %}}
You can add standard markdown syntax:

- multiple paragraphs
- bullet point lists
- _emphasized_, **bold** and even **_bold emphasized_** text
- [links](https://example.com)
- etc.

```plaintext
...and even source code
```

> the possibilities are endless (almost - including other shortcodes may or may not work)
{{% /expand %}}