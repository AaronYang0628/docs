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

  <p> <b>1.get helm repo </b></p>

  {{% notice style="transparent" %}}
  ```bash
helm repo add ay-helm-mirror https://aaronyang0628.github.io/helm-chart-mirror/charts
  helm repo update
  ```
  {{% /notice %}}

  <p> <b>2.prepare</b> `act-runner-secret` </p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl -n application create secret generic act-runner-secret \
    --from-literal=act-runner-token=4w3Sx0Hwe6VFevl473ZZ4nFVDvFvhKcEUBvpJ09L
  ```
  {{% /notice %}}

  <p> <b>3.prepare values </b></p>

  {{% notice style="transparent" %}}
  ```bash
  echo "
  replicas: 1
  runner:
    instanceURL: http://192.168.100.125:30300
    token:
      fromSecret:
        name: "act-runner-secret"
        key: "act-runner-token"" > act-runner-values.yaml
  ```
  {{% /notice %}}

  <p> <b>4.install chart </b></p>

  {{% notice style="transparent" %}}
  ```bash
  helm upgrade  --create-namespace -n application --install -f ./act-runner-values.yaml act-runner ay-helm-mirror/act-runner
  ```
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
  kubectl -n application create secret generic act-runner-secret \
    --from-literal=act-runner-token=4w3Sx0Hwe6VFevl473ZZ4nFVDvFvhKcEUBvpJ09L
  ```
  {{% /notice %}}

  {{% expand title="act-runner-token could be get from here" %}}
  `token` is used for authentication and identification, such as P2U1U0oB4XaRCi8azcngmPCLbRpUGapalhmddh23. Each `token` can be used to create multiple runners, until it is replaced with a new `token` using the reset link. You can obtain different levels of 'tokens' from the following places to create the corresponding level of 'runners':

  Instance level: The admin settings page, like `<your_gitea.com>/-/admin/actions/runners`.

  ![act_runner_token](../../../images/content/gitea/act_runner_token.png)
  {{% /expand %}}

  <p> 
    <b>2.prepare</b> 
    <span class="copy-to-clipboard" dir="auto">
      <code class="copy-to-clipboard-code highlight" data-code="act-runner.yaml">act-runner.yaml</code> 
      <button class="inline-copy-to-clipboard-button" title="Copy to clipboard"><i class="far fa-copy"></i></button> 
    </span> 
  </p>
  


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
        repoURL: https://aaronyang0628.github.io/helm-chart-mirror/charts
        chart: act-runner
        targetRevision: 0.2.2
        helm:
          releaseName: act-runner
          values: |
            image:
              name: vegardit/gitea-act-runner
              tag: "dind-0.2.13"
              repository: m.daocloud.io/docker.io
            runner:
              instanceURL: https://192.168.100.125:30300
              token:
                fromSecret:
                  name: "act-runner-secret"
                  key: "act-runner-token"
              config:
                enabled: true
                data: |
                  log:
                    level: info
                  runner:
                    labels:
                      - ubuntu-latest:docker://m.daocloud.io/docker.gitea.com/runner-images:ubuntu-latest
                  container:
                    force_pull: true
            persistence:
              enabled: true
              storageClassName: ""
              accessModes: ReadWriteOnce
              size: 10Gi
            autoscaling:
              enabled: true
              minReplicas: 1
              maxReplicas: 3
            replicas: 1  
            securityContext:
              privileged: true
              runAsUser: 0
              runAsGroup: 0
              fsGroup: 0
              capabilities:
                add: ["NET_ADMIN", "SYS_ADMIN"]
            podSecurityContext:
              runAsUser: 0
              runAsGroup: 0
              fsGroup: 0
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
  {{< /tabs >}}

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

  ![act_runner_token](../../../images/content/gitea/enable_action.png)
  {{% /notice %}}

{{< /tab >}}

{{< tab title="Podman" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. Podman has installed, and the `podman` command is available in your PATH.</p></br>

  <p> <b>1.prepare data and config dir </b></p>

  {{% notice style="transparent" %}}
  ```bash
  mkdir -p /opt/gitea_act_runner/{data,config} \
  && chown -R 1000:1000 /opt/gitea_act_runner \
  && chmod -R 755 /opt/gitea_act_runner
  ```
  {{% /notice %}}

  <p> <b>2.run container </b></p>

  {{% notice style="transparent" %}}
  ```bash
  podman run -it \
    --name gitea_act_runner \
    --rm \
    --privileged \
    --network=host \
    -v /opt/gitea_act_runner/data:/data \
    -v /opt/gitea_act_runner/config:/config \
    -v /var/run/podman/podman.sock:/var/run/docker.sock \
    -e GITEA_INSTANCE_URL="http://10.200.60.64:30300" \
    -e GITEA_RUNNER_REGISTRATION_TOKEN="5lgsrOzfKz3RiqeMWxxUb9RmUPEWNnZ6hTTZV0DL" \
    m.daocloud.io/docker.io/gitea/act_runner:latest-dind-rootless
  ```
  {{% /notice %}}

  {{% notice style="important" title="Using Mirror" %}} 
  you can run an addinational **daocloud** image to accelerate your pulling, check [Daocloud Proxy](kubernetes/proxy/daocloud/index.html)
  {{% /notice %}}

{{< /tab >}}

{{< tab title="Docker" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. Docker 
  2. Podman has installed, and the `podman` command is available in your PATH.

  <p> <b>1.prepare data and config dir </b></p>

  {{% notice style="transparent" %}}
  ```bash
  mkdir -p /opt/gitea_act_runner/{data,config} \
  && chown -R 1000:1000 /opt/gitea_act_runner \
  && chmod -R 755 /opt/gitea_act_runner
  ```
  {{% /notice %}}

  <p> <b>2.run container </b></p>

  {{% notice style="transparent" %}}
  ```bash
  docker run -it \
    --name gitea_act_runner \
    --rm \
    --privileged \
    --network=host \
    -v /opt/gitea_act_runner/data:/data \
    -v /opt/gitea_act_runner/config:/config \
    -e GITEA_INSTANCE_URL="http://192.168.100.125:30300" \
    -e GITEA_RUNNER_REGISTRATION_TOKEN="5lgsrOzfKz3RiqeMWxxUb9RmUPEWNnZ6hTTZV0DL" \
    m.daocloud.io/docker.io/gitea/act_runner:latest-dind
  ```
  {{% /notice %}}

  {{% notice style="important" title="Using Mirror" %}} 
  you can run an addinational **daocloud** image to accelerate your pulling, check [Daocloud Proxy](kubernetes/proxy/daocloud/index.html)
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