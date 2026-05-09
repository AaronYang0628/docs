+++
title = 'Wechat Markdown Editor'
date = 2024-03-07T15:00:59+08:00
weight = 14
+++

Official Documentation: [https://github.com/doocs/md](https://github.com/doocs/md)

### 🚀Installation

{{< tabs groupid="wx-editor" style="primary" title="Install By" icon="thumbtack" >}}

{{< tab title="🐙ArgoCD (ZJ)" style="transparent" >}}
  {{% include "/Installation/SNIPPET/_argo_cd_preliminary.md" %}}

  <p> <b>1.prepare</b> `deploy-wx-article-editor.yaml` </p>

  {{% notice style="transparent" %}}
  ```yaml
  kubectl -n argocd apply -f - <<'EOF'
  apiVersion: argoproj.io/v1alpha1
  kind: Application
  metadata:
    name: wx-article-editor
    namespace: argocd
  spec:
    project: default
    source:
      repoURL: https://bjw-s-labs.github.io/helm-charts
      chart: app-template
      targetRevision: 4.4.0
      helm:
        values: |
          controllers:
            main:
              containers:
                app:
                  image:
                    repository: m.daocloud.io/docker.io/doocs/md
                    tag: latest
                    pullPolicy: IfNotPresent
                  probes:
                    liveness:
                      enabled: true
                    readiness:
                      enabled: true
                    startup:
                      enabled: true

          service:
            app:
              controller: main
              ports:
                http:
                  port: 80

          ingress:
            app:
              enabled: true
              className: nginx
              annotations:
                kubernetes.io/ingress.class: nginx
                cert-manager.io/cluster-issuer: self-signed-ca-issuer
              hosts:
                - host: md.dev.72602.online
                  paths:
                    - path: /
                      pathType: Prefix
                      service:
                        identifier: app
                        port: http
              tls:
                - secretName: md.dev.72602.online-tls
                  hosts:
                    - md.dev.72602.online
    destination:
      server: https://kubernetes.default.svc
      namespace: application
    syncPolicy:
      syncOptions:
        - CreateNamespace=true
        - ServerSideApply=true
  EOF
  ```
  {{% /notice %}}

  <p> <b>2.sync by argocd</b></p>

  {{% notice style="transparent" %}}
  ```bash
  argocd app sync argocd/wx-article-editor
  ```
  {{% /notice %}}

{{< /tab >}}

{{< tab title="🐙ArgoCD (72602)" style="transparent" >}}
  {{% include "/Installation/SNIPPET/_argo_cd_preliminary.md" %}}

  <p> <b>1.prepare</b> `deploy-wx-article-editor.yaml` </p>

  {{% notice style="transparent" %}}
  ```yaml
  kubectl -n argocd apply -f - <<'EOF'
  apiVersion: argoproj.io/v1alpha1
  kind: Application
  metadata:
    name: wx-article-editor
    namespace: argocd
  spec:
    project: default
    source:
      repoURL: https://bjw-s-labs.github.io/helm-charts
      chart: app-template
      targetRevision: 4.4.0
      helm:
        values: |
          controllers:
            main:
              containers:
                app:
                  image:
                    repository: m.daocloud.io/docker.io/doocs/md
                    tag: latest
                    pullPolicy: IfNotPresent
                  probes:
                    liveness:
                      enabled: true
                    readiness:
                      enabled: true
                    startup:
                      enabled: true

          service:
            app:
              controller: main
              ports:
                http:
                  port: 80

          ingress:
            app:
              enabled: true
              className: nginx
              annotations:
                kubernetes.io/ingress.class: nginx
                cert-manager.io/cluster-issuer: letsencrypt
              hosts:
                - host: md.72602.online
                  paths:
                    - path: /
                      pathType: Prefix
                      service:
                        identifier: app
                        port: http
              tls:
                - secretName: md.72602.online-tls
                  hosts:
                    - md.72602.online
    destination:
      server: https://kubernetes.default.svc
      namespace: application
    syncPolicy:
      syncOptions:
        - CreateNamespace=true
        - ServerSideApply=true
  EOF
  ```
  {{% /notice %}}

  <p> <b>2.sync by argocd</b></p>

  {{% notice style="transparent" %}}
  ```bash
  argocd app sync argocd/wx-article-editor
  ```
  {{% /notice %}}

{{< /tab >}}

{{< tab title="🐳Docker" style="transparent" >}}
  {{% include "content\Installation\SNIPPET\_container_preliminary.md" %}}

  <p> <b>1.run container</b></p>

  {{% notice style="transparent" %}}
  ```bash
  docker run -d --name wx-article-editor -p 8080:80 doocs/md:latest
  ```
  {{% /notice %}}

  <p> <b>2.access in browser</b></p>

  {{% notice style="transparent" %}}
  ```text
  open http://localhost:8080
  ```
  {{% /notice %}}

{{< /tab >}}

{{< /tabs >}}

### Verify

{{% notice style="transparent" %}}
```bash
kubectl -n application get pods
kubectl -n application get ingress
```
{{% /notice %}}

If deployed in ZJ environment, open `https://md.dev.72602.online`.

If deployed in 72602 environment, open `https://md.72602.online`.

### 🛎️FAQ

{{% expand title="Q1: Page is blank after opening domain" %}}
Check Pod and Ingress first:

```bash
kubectl -n application get pods
kubectl -n application logs deploy/wx-article-editor --tail=100
kubectl -n application describe ingress
```

Then verify the domain resolves to your ingress entry node.
{{% /expand %}}

{{% expand title="Q2: Browser does not trust HTTPS certificate" %}}
If you use self-signed issuer in ZJ, export CA cert and import into browser:

```bash
kubectl -n basic-components get secret root-secret -o jsonpath='{.data.tls\.crt}' | base64 -d > cert-manager-self-signed-ca-secret.crt
```
{{% /expand %}}
