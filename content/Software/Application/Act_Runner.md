+++
tags = ["Git Gitea Runner"]
title = 'Install Act Runner'
date = 2025-06-07T15:00:59+08:00
weight = 11
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
  helm repo add gringolito https://gringolito.github.io/helm-charts
  helm repo update
  ```
  {{% /notice %}}

  <p> <b>2.install chart </b></p>

  {{% notice style="transparent" %}}
  ```bash
  helm install act-runner gringolito/act-runner --generate-name
  ```
  {{% /notice %}}

  {{% notice style="important" title="Using Mirror" %}} 
  ```shell
  helm repo add ay-helm-mirror https://aaronyang0628.github.io/helm-chart-mirror/charts \
    && helm install ay-helm-mirror/act-runner --generate-name --version 0.2.0
  ```
  for more information, you can check 🔗[https://aaronyang0628.github.io/helm-chart-mirror/](https://aaronyang0628.github.io/helm-chart-mirror/)
  {{% /notice %}}

{{< /tab >}}

{{< tab title="ArgoCD" style="transparent">}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/kubernetes/cluster/index.html" target="_blank">link</a> </p></br>
  2. ArgoCD has installed, if not check 🔗<a href="/docs/software/cicd/argocd/index.html" target="_blank">link</a> </p></br>
  3. Helm binary has installed, if not check 🔗<a href="/docs/software/binary/helm/index.html" target="_blank">link</a> </p></br>

  <p> <b>1.prepare</b> `act-runner-secret` </p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl create secret generic act-runner-secret \
    --from-literal=act-runner-token=4w3Sx0Hwe6VFevl473ZZ4nFVDvFvhKcEUBvpJ09L
  ```
  {{% /notice %}}

  {{% expand title="act-runner-token could be get from here" %}}
  `token` is used for authentication and identification, such as P2U1U0oB4XaRCi8azcngmPCLbRpUGapalhmddh23. Each `token` can be used to create multiple runners, until it is replaced with a new `token` using the reset link. You can obtain different levels of 'tokens' from the following places to create the corresponding level of 'runners':

  Instance level: The admin settings page, like `<your_gitea.com>/-/admin/actions/runners`.

  ![act_runner_token](../../../images/content/gitea/act_runner_token.png)
  {{% /expand %}}

  <p> <b>2.prepare</b> `act-runner.yaml` </p>

  {{< tabs groupid="2222" title="Storage In " icon="thumbtack" >}}
    {{% tab title="PVC" %}}
    kubectl -n argocd apply -f - <<EOF
    apiVersion: argoproj.io/v1alpha1
    kind: Application
    metadata:
      name: act-runner
    spec:
      syncPolicy:
        syncOptions:
        - CreateNamespace=true
      project: default
      source:
        repoURL: https://gringolito.github.io/helm-charts
        chart: act-runner
        targetRevision: 0.2.0
        helm:
          releaseName: act-runner
          values: |
            image:
              name: gitea/act_runner
              tag: "0.2.11"
              repository: m.daocloud.io/docker.io
            runner:
              instanceURL: http://10.200.60.64:30300  # https://gitea.ay.dev:32443
              token:
                fromSecret:
                  name: "act-runner-secret"
                  key: "act-runner-token"
              config:
                enabled: false
                data: |
                  log:
                    level: info
                  runner:
                    labels:
                      - ubuntu-latest:docker://docker.gitea.com/runner-images:ubuntu-latest
                      - ubuntu-22.04:docker://docker.gitea.com/runner-images:ubuntu-22.04
                      - ubuntu-20.04:docker://docker.gitea.com/runner-images:ubuntu-20.04
                  container:
                    force_pull: true
            persistence:
              enabled: true
              storageClassName: ""
              accessModes: ReadWriteOnce
              size: 1Gi
            autoscaling:
              enabled: false
              minReplicas: 1
              maxReplicas: 100
            replicas: 1  
            securityContext: 
              privileged: true
            resources: 
              requests:
                cpu: 200m
                memory: 512Mi
              limits:
                cpu: 1000m
                memory: 2048Mi
      destination:
        server: https://kubernetes.default.svc
        namespace: application
    EOF
    {{% /tab %}}

    {{% tab title="Plain" %}}
    apiVersion: argoproj.io/v1alpha1
    kind: Application
    metadata:
      name: act-runner
    spec:
      syncPolicy:
        syncOptions:
        - CreateNamespace=true
      project: default
      source:
        repoURL: https://gringolito.github.io/helm-charts
        chart: act-runner
        targetRevision: 0.2.0
        helm:
          releaseName: act-runner
          values: |
            image:
              name: gitea/act_runner
              tag: "0.2.11"
              repository: m.daocloud.io/docker.io
            runner:
              instanceURL: http://10.200.60.64:30300  # https://gitea.ay.dev:32443
              token:
                fromSecret:
                  name: "act-runner-secret"
                  key: "act-runner-token"
              config:
                enabled: false
                data: |
                  log:
                    level: info
                  runner:
                    labels:
                      - ubuntu-latest:docker://docker.gitea.com/runner-images:ubuntu-latest
                      - ubuntu-22.04:docker://docker.gitea.com/runner-images:ubuntu-22.04
                      - ubuntu-20.04:docker://docker.gitea.com/runner-images:ubuntu-20.04
                  container:
                    force_pull: true
            persistence:
              enabled: true
              storageClassName: ""
              accessModes: ReadWriteOnce
              size: 1Gi
            autoscaling:
              enabled: false
              minReplicas: 1
              maxReplicas: 100
            replicas: 1  
            securityContext: 
              privileged: true
            resources: 
              requests:
                cpu: 200m
                memory: 512Mi
              limits:
                cpu: 1000m
                memory: 2048Mi
      destination:
        server: https://kubernetes.default.svc
        namespace: application
    {{% /tab %}}
  {{< /tabs >}}


  <p> <b>3.apply to k8s</b></p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl -n argocd apply -f act-runner.yaml
  ```
  {{% /notice %}}

  <p> <b>4.sync by argocd</b></p>

  {{% notice style="transparent" %}}
  ```bash
  argocd app sync argocd/act-runner
  ```
  {{% /notice %}}

  <p> <b>5.use action</b></p>

  {{% notice style="transparent" %}}
  Even if Actions is enabled for the Gitea instance, repositories still **disable** Actions by default.

  To enable it, go to the settings page of your repository like `your_gitea.com/<owner>/repo/settings` and enable Enable Repository Actions.

  ![act_runner_token](../../../images/content/gitea/act_runner_token.png)
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