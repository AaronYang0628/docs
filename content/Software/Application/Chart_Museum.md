+++
tags = ["Chart Museum"]
title = 'Install Chart Museum'
date = 2024-06-07T15:00:59+08:00
weight = 31
+++


### Installation

{{< tabs groupid="prometheus" style="primary" title="Install By" icon="thumbtack" >}}

{{< tab title="Helm" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/kubernetes/cluster/index.html" target="_blank">link</a> </p></br>
  2. Helm binary has installed, if not check 🔗<a href="/docs/software/binary/helm/index.html" target="_blank">link</a> </p></br>

  <p> <b>1.get helm repo </b></p>

  {{% notice style="transparent" %}}
  ```bash
  helm repo add ay-helm-mirror https://aaronyang0628.github.io/helm-chart-mirror/charts
  helm repo update
  ```
  {{% /notice %}}

  <p> <b>2.install chart </b></p>

  {{% notice style="transparent" %}}
  ```bash
  helm install ay-helm-mirror/kube-prometheus-stack --generate-name
  ```
  {{% /notice %}}

  {{% notice style="important" title="Using Mirror" %}} 
  ```shell
  helm repo add ay-helm-mirror https://aaronyang0628.github.io/helm-chart-mirror/charts \
    && helm install ay-helm-mirror/cert-manager --generate-name --version 1.17.2
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
    kubectl get namespaces basic-components > /dev/null 2>&1 || kubectl create namespace basic-components
    kubectl -n basic-components create secret generic chart-museum-credentials \
        --from-literal=username=admin \
        --from-literal=password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16)

    {{% /tab %}}

    {{% tab title="Minio" %}}
    kubectl get namespaces basic-components > /dev/null 2>&1 || kubectl create namespace basic-components
    kubectl -n basic-components create secret generic chart-museum-credentials \
        --from-literal=username=admin \
        --from-literal=password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16) \
        --from-literal=aws_access_key_id=$(kubectl -n storage get secret minio-credentials -o jsonpath='{.data.rootUser}' | base64 -d) \
        --from-literal=aws_secret_access_key=$(kubectl -n storage get secret minio-credentials -o jsonpath='{.data.rootPassword}' | base64 -d)

    {{% /tab %}}
  {{< /tabs >}}

  <p> <b>2.prepare</b> `chart-museum.yaml` </p>

  {{< tabs groupid="2222" title="Storage In " icon="thumbtack" >}}
    {{% tab title="PVC" %}}
    kubectl apply -f - << EOF
    apiVersion: argoproj.io/v1alpha1
    kind: Application
    metadata:
      name: chart-museum
    spec:
      syncPolicy:
        syncOptions:
          - CreateNamespace=true
      project: default
      source:
        repoURL: https://chartmuseum.github.io/charts
        chart: chartmuseum
        targetRevision: 3.10.3
        helm:
          releaseName: chart-museum
          values: |
            replicaCount: 1
            image:
              repository: m.daocloud.io/ghcr.io/helm/chartmuseum
            env:
              open:
                DISABLE_API: false
                STORAGE: local
                AUTH_ANONYMOUS_GET: true
              existingSecret: "chart-museum-credentials"
              existingSecretMappings:
                BASIC_AUTH_USER: "username"
                BASIC_AUTH_PASS: "password"
            persistence:
              enabled: false
              storageClass: ""
            volumePermissions:
              image:
                registry: m.daocloud.io/docker.io
            ingress:
              enabled: true
              ingressClassName: nginx
              annotations:
                cert-manager.io/cluster-issuer: self-signed-ca-issuer
                nginx.ingress.kubernetes.io/rewrite-target: /$1
              hosts:
                - name: chartmuseum.ay.dev
                  path: /?(.*)
                  tls: true
                  tlsSecret: chartmuseum.ay.dev-tls
      destination:
        server: https://kubernetes.default.svc
        namespace: basic-components
    EOF
    {{% /tab %}}

    {{% tab title="Minio" %}}
    kubectl apply -f - << EOF
    apiVersion: argoproj.io/v1alpha1
    kind: Application
    metadata:
      name: chart-museum
    spec:
      syncPolicy:
        syncOptions:
          - CreateNamespace=true
      project: default
      source:
        repoURL: https://chartmuseum.github.io/charts
        chart: chartmuseum
        targetRevision: 3.10.3
        helm:
          releaseName: chart-museum
          values: |
            replicaCount: 1
            image:
              repository: m.daocloud.io/ghcr.io/helm/chartmuseum
            env:
              open:
                DISABLE_API: false
                STORAGE: amazon
                STORAGE_AMAZON_ENDPOINT: http://minio-api.ay.dev:32080
                STORAGE_AMAZON_BUCKET: chart-museum
                STORAGE_AMAZON_PREFIX: charts
                STORAGE_AMAZON_REGION: us-east-1
                AUTH_ANONYMOUS_GET: true
              existingSecret: "chart-museum-credentials"
              existingSecretMappings:
                BASIC_AUTH_USER: "username"
                BASIC_AUTH_PASS: "password"
                AWS_ACCESS_KEY_ID: "aws_access_key_id"
                AWS_SECRET_ACCESS_KEY: "aws_secret_access_key"
            persistence:
              enabled: false
              storageClass: ""
            volumePermissions:
              image:
                registry: m.daocloud.io/docker.io
            ingress:
              enabled: true
              ingressClassName: nginx
              annotations:
                cert-manager.io/cluster-issuer: self-signed-ca-issuer
                nginx.ingress.kubernetes.io/rewrite-target: /$1
              hosts:
                - name: chartmuseum.ay.dev
                  path: /?(.*)
                  tls: true
                  tlsSecret: chartmuseum.ay.dev-tls
      destination:
        server: https://kubernetes.default.svc
        namespace: basic-components
    EOF
    {{% /tab %}}

    {{% tab title="Plain" %}}
    apiVersion: argoproj.io/v1alpha1
    kind: Application
    metadata:
      name: chart-museum
    spec:
      syncPolicy:
        syncOptions:
          - CreateNamespace=true
      project: default
      source:
        repoURL: https://chartmuseum.github.io/charts
        chart: chartmuseum
        targetRevision: 3.10.3
        helm:
          releaseName: chart-museum
          values: |
            replicaCount: 1
            image:
              repository: m.daocloud.io/ghcr.io/helm/chartmuseum
            env:
              open:
                DISABLE_API: false
                STORAGE: local
                AUTH_ANONYMOUS_GET: true
              existingSecret: "chart-museum-credentials"
              existingSecretMappings:
                BASIC_AUTH_USER: "username"
                BASIC_AUTH_PASS: "password"
            persistence:
              enabled: false
              storageClass: ""
            volumePermissions:
              image:
                registry: m.daocloud.io/docker.io
            ingress:
              enabled: true
              ingressClassName: nginx
              annotations:
                cert-manager.io/cluster-issuer: self-signed-ca-issuer
                nginx.ingress.kubernetes.io/rewrite-target: /$1
              hosts:
                - name: chartmuseum.ay.dev
                  path: /?(.*)
                  tls: true
                  tlsSecret: chartmuseum.ay.dev-tls
      destination:
        server: https://kubernetes.default.svc
        namespace: basic-components
    {{% /tab %}}

  {{< /tabs >}}


  <p> <b>3.sync by argocd</b></p>

  {{% notice style="transparent" %}}
  ```bash
  argocd app sync argocd/chart-museum
  ```
  {{% /notice %}}


{{< /tab >}}


{{< tab title="Docker Compose" style="default" >}}
  install based on docker
  {{< tabs groupid="tabs-example-language" >}}
    {{% tab title="shell" %}}
  ```bash
  echo  "start from head is important"
  ```
    {{% /tab %}}
  {{< /tabs >}}

{{< /tab >}}

{{< /tabs >}}


### Uploading a Chart Package
<sub>*Follow **"How to Run"** section below to get ChartMuseum up and running at ht<span>tp:/</span>/localhost:8080*<sub>

First create `mychart-0.1.0.tgz` using the [Helm CLI](https://docs.helm.sh/using_helm/#installing-helm):
```
cd mychart/
helm package .
```

Upload `mychart-0.1.0.tgz`:
```bash
curl --data-binary "@mychart-0.1.0.tgz" http://localhost:8080/api/charts
```

If you've signed your package and generated a [provenance file](https://github.com/helm/helm-www/blob/master/content/en/docs/topics/provenance.md), upload it with:
```bash
curl --data-binary "@mychart-0.1.0.tgz.prov" http://localhost:8080/api/prov
```

Both files can also be uploaded at once (or one at a time) on the `/api/charts` route using the `multipart/form-data` format:

```bash
curl -F "chart=@mychart-0.1.0.tgz" -F "prov=@mychart-0.1.0.tgz.prov" http://localhost:8080/api/charts
```

You can also use the [helm-push plugin](https://github.com/chartmuseum/helm-push):
```
helm cm-push mychart/ chartmuseum
```

### Installing Charts into Kubernetes
Add the URL to your *ChartMuseum* installation to the local repository list:
```bash
helm repo add chartmuseum http://localhost:8080
```

Search for charts:
```bash
helm search repo chartmuseum/
```

Install chart:
```bash
helm install chartmuseum/mychart --generate-name
```


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