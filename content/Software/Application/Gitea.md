+++
tags = ["Git Gitea"]
title = 'Install Gitea'
date = 2025-06-07T15:00:59+08:00
weight = 71
+++


### Installation

{{< tabs groupid="prometheus" style="primary" title="Install By" icon="thumbtack" >}}

{{< tab title="Helm" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/kubernetes/cluster/index.html" target="_blank">link</a> </p></br>
  2. Helm binary has installed, if not check 🔗<a href="/docs/software/binary/helm/index.html" target="_blank">link</a> </p></br>
  3. CertManager has installed, if not check 🔗<a href="/docs/software/networking/cert-manager/index.html" target="_blank">link</a> </p></br>
  4. Ingress has installed, if not check 🔗<a href="/docs/software/networking/ingress/index.html" target="_blank">link</a> </p></br>

  <p> <b>1.get helm repo </b></p>

  {{% notice style="transparent" %}}
  ```bash
  helm repo add gitea-charts https://dl.gitea.com/charts/
  helm repo update
  ```
  {{% /notice %}}

  <p> <b>2.install chart </b></p>

  {{% notice style="transparent" %}}
  ```bash
  helm install gitea gitea-charts/gitea --generate-name
  ```
  {{% /notice %}}

  {{% notice style="important" title="Using Mirror" %}} 
  ```shell
  helm repo add ay-helm-mirror https://aaronyang0628.github.io/helm-chart-mirror/charts \
    && helm install ay-helm-mirror/gitea --generate-name --version 12.1.3
  ```
  for more information, you can check 🔗[https://aaronyang0628.github.io/helm-chart-mirror/](https://aaronyang0628.github.io/helm-chart-mirror/)
  {{% /notice %}}

{{< /tab >}}

{{< tab title="ArgoCD" style="transparent">}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/kubernetes/cluster/index.html" target="_blank">link</a> </p></br>
  2. ArgoCD has installed, if not check 🔗<a href="/docs/software/cicd/argocd/index.html" target="_blank">link</a> </p></br>
  3. Helm binary has installed, if not check 🔗<a href="/docs/software/binary/helm/index.html" target="_blank">link</a> </p></br>
  4. Ingres has installed on argoCD, if not check 🔗<a href="/docs/software/networking/ingress/index.html" target="_blank">link</a> </p></br>
  5. Minio has installed, if not check 🔗<a href="/docs/software/storage/minio/index.html" target="_blank">link</a> </p></br>

  <p> <b>1.prepare</b> `chart-museum-credentials` </p>

  {{< tabs groupid="2222" title="Storage In " icon="thumbtack" >}}
    {{% tab title="PVC" %}}
    kubectl get namespaces application > /dev/null 2>&1 || kubectl create namespace application
    kubectl -n application create secret generic gitea-admin-credentials \
        --from-literal=username=gitea_admin \
        --from-literal=password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16)

    {{% /tab %}}

    {{% tab title="Minio" %}}
    kubectl get namespaces application > /dev/null 2>&1 || kubectl create namespace application
    kubectl -n application create secret generic gitea-admin-credentials \
        --from-literal=username=gitea_admin \
        --from-literal=password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16)

    {{% /tab %}}
  {{< /tabs >}}

  <p> <b>2.prepare</b> `gitea.yaml` </p>

  {{< tabs groupid="2222" title="Storage In " icon="thumbtack" >}}
    {{% tab title="PVC" %}}
    apiVersion: argoproj.io/v1alpha1
    kind: Application
    metadata:
      name: gitea
    spec:
      syncPolicy:
        syncOptions:
        - CreateNamespace=true
      project: default
      source:
        repoURL: https://dl.gitea.com/charts/
        chart: gitea
        targetRevision: 10.1.4
        helm:
          releaseName: gitea
          values: |
            image:
              registry: m.daocloud.io/docker.io
            service:
              http:
                type: ClusterIP
              ssh:
                type: NodePort
                port: 22
                nodePort: 32022
            ingress:
              enabled: true
              ingressClassName: nginx
              annotations:
                kubernetes.io/ingress.class: nginx
                nginx.ingress.kubernetes.io/rewrite-target: /$1
                cert-manager.io/cluster-issuer: self-signed-ca-issuer
              hosts:
              - host: gitea.ay.dev
                paths:
                - path: /?(.*)
                  pathType: ImplementationSpecific
              tls:
              - secretName: gitea.ay.dev-tls
                hosts:
                - gitea.ay.dev
            persistence:
              enabled: true
              size: 8Gi
              storageClass: ""
            redis-cluster:
              enabled: false
            postgresql-ha:
              enabled: false
            postgresql:
              enabled: true
              architecture: standalone
              image:
                registry: m.daocloud.io/docker.io
              primary:
                persistence:
                  enabled: false
                  storageClass: ""
                  size: 8Gi
              readReplicas:
                replicaCount: 1
                persistence:
                  enabled: true
                  storageClass: ""
                  size: 8Gi
              backup:
                enabled: false
              volumePermissions:
                enabled: false
                image:
                  registry: m.daocloud.io/docker.io
              metrics:
                enabled: false
                image:
                  registry: m.daocloud.io/docker.io
            gitea:
              admin:
                existingSecret: gitea-admin-credentials
                email: aaron19940628@gmail.com
              config:
                database:
                  DB_TYPE: postgres
                session:
                  PROVIDER: db
                cache:
                  ADAPTER: memory
                queue:
                  TYPE: level
                indexer:
                  ISSUE_INDEXER_TYPE: bleve
                  REPO_INDEXER_ENABLED: true
                repository:
                  MAX_CREATION_LIMIT: 10
                  DISABLED_REPO_UNITS: "repo.wiki,repo.ext_wiki,repo.projects"
                  DEFAULT_REPO_UNITS: "repo.code,repo.releases,repo.issues,repo.pulls"
                server:
                  PROTOCOL: http
                  LANDING_PAGE: login
                  DOMAIN: gitea.ay.dev
                  ROOT_URL: https://gitea.ay.dev:32443/
                  SSH_DOMAIN: ssh.gitea.ay.dev
                  SSH_PORT: 32022
                  SSH_AUTHORIZED_PRINCIPALS_ALLOW: email
                admin:
                  DISABLE_REGULAR_ORG_CREATION: true
                security:
                  INSTALL_LOCK: true
                service:
                  REGISTER_EMAIL_CONFIRM: true
                  DISABLE_REGISTRATION: true
                  ENABLE_NOTIFY_MAIL: false
                  DEFAULT_ALLOW_CREATE_ORGANIZATION: false
                  SHOW_MILESTONES_DASHBOARD_PAGE: false
                migrations:
                  ALLOW_LOCALNETWORKS: true
                mailer:
                  ENABLED: false
                i18n:
                  LANGS: "en-US,zh-CN"
                  NAMES: "English,简体中文"
                oauth2:
                  ENABLE: false
      destination:
        server: https://kubernetes.default.svc
        namespace: application
    {{% /tab %}}

    {{% tab title="Minio" %}}
    sssss
    {{% /tab %}}
  {{< /tabs >}}


  <p> <b>3.apply to k8s</b></p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl -n argocd apply -f gitea.yaml
  ```
  {{% /notice %}}

  <p> <b>4.sync by argocd</b></p>

  {{% notice style="transparent" %}}
  ```bash
  argocd app sync argocd/gitea
  ```
  {{% /notice %}}

  <p> <b>5.decode admin password</b></p>
  login 🔗<a href="https://gitea.ay.dev:32443/" target="_blank">https://gitea.ay.dev:32443/</a> </p>, using user <b>gitea_admin</b> and password
  {{% notice style="transparent" %}}
  ```bash
  kubectl -n application get secret gitea-admin-credentials -o jsonpath='{.data.password}' | base64 -d
  ```
  {{% /notice %}}


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