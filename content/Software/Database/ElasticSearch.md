+++
title = 'Install ElasticSearch'
date = 2024-04-12T15:00:59+08:00
weight = 50
+++

### Installation

{{< tabs groupid="prometheus" style="primary" title="Install By" icon="thumbtack" >}}

{{< tab title="Helm" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/kubernetes/cluster/index.html" target="_blank">link</a> </p></br>
  2. Helm has installed, if not check 🔗<a href="/docs/software/binary/k8s_realted/index.html#helm" target="_blank">link</a> </p></br>

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

  {{% notice style="important" title="Using Proxy" %}} 
  for more information, you can check 🔗[https://artifacthub.io/packages/helm/prometheus-community/prometheus](https://artifacthub.io/packages/helm/prometheus-community/prometheus)
  {{% /notice %}}

{{< /tab >}}

{{< tab title="ArgoCD" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/kubernetes/cluster/index.html" target="_blank">link</a> </p></br>
  2. Helm has installed, if not check 🔗<a href="/docs/software/binary/k8s_realted/index.html#helm" target="_blank">link</a> </p></br>
  3. ArgoCD has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>

  <p> <b>1.prepare</b> `deploy-elasticsearch.yaml` </p>

  {{% notice style="transparent" %}}
  ```yaml
  kubectl apply -f - << EOF
  apiVersion: argoproj.io/v1alpha1
  kind: Application
  metadata:
    name: elastic-search
  spec:
    syncPolicy:
      syncOptions:
      - CreateNamespace=true
    project: default
    source:
      repoURL: https://charts.bitnami.com/bitnami
      chart: elasticsearch
      targetRevision: 19.11.3
      helm:
        releaseName: elastic-search
        values: |
          global:
            kibanaEnabled: true
          clusterName: elastic
          image:
            registry: m.zjvis.net/docker.io
            pullPolicy: IfNotPresent
          security:
            enabled: false
          service:
            type: ClusterIP
          ingress:
            enabled: true
            annotations:
              cert-manager.io/cluster-issuer: self-signed-ca-issuer
              nginx.ingress.kubernetes.io/rewrite-target: /$1
            hostname: elastic-search.dev.tech
            ingressClassName: nginx
            path: /?(.*)
            tls: true
          master:
            masterOnly: false
            replicaCount: 1
            persistence:
              enabled: false
            resources:
              requests:
                cpu: 2
                memory: 1024Mi
              limits:
                cpu: 4
                memory: 4096Mi
            heapSize: 2g
          data:
            replicaCount: 0
            persistence:
              enabled: false
          coordinating:
            replicaCount: 0
          ingest:
            enabled: true
            replicaCount: 0
            service:
              enabled: false
              type: ClusterIP
            ingress:
              enabled: false
          metrics:
            enabled: false
            image:
              registry: m.zjvis.net/docker.io
              pullPolicy: IfNotPresent
          volumePermissions:
            enabled: false
            image:
              registry: m.zjvis.net/docker.io
              pullPolicy: IfNotPresent
          sysctlImage:
            enabled: true
            registry: m.zjvis.net/docker.io
            pullPolicy: IfNotPresent
          kibana:
            elasticsearch:
              hosts:
                - '{{ include "elasticsearch.service.name" . }}'
              port: '{{ include "elasticsearch.service.ports.restAPI" . }}'
          esJavaOpts: "-Xmx2g -Xms2g"        
    destination:
      server: https://kubernetes.default.svc
      namespace: application
  EOF
  ```
  {{% /notice %}}

  <p> <b>3.sync by argocd</b></p>

  {{% notice style="transparent" %}}
  ```bash
  argocd app sync argocd/elastic-search
  ```
  {{% /notice %}}

  <p> <b>4.extract elasticsearch admin credentials </b></p>

  {{% notice style="transparent" %}}
  ```bash
  a
  ```
  {{% /notice %}}

  <p> <b>5.invoke http api </b></p>

  {{% notice style="transparent" %}}
  ```text
  add `$K8S_MASTER_IP elastic-search.dev.tech` to `/etc/hosts`
  ```

  ```shell
  curl -k -H "Content-Type: application/json" \
      -X POST "https://elastic-search.dev.tech:32443/books/_doc?pretty" \
      -d '{"name": "Snow Crash", "author": "Neal Stephenson", "release_date": "1992-06-01", "page_count": 470}'
  ```
  {{% /notice %}}


{{< /tab >}}


{{< tab title="Docker" style="transparent" >}}
 <p> <b>Preliminary </b></p>
  1. Docker|Podman|Buildah has installed, if not check 🔗<a href="/docs/software/container/index.html" target="_blank">link</a> </p></br>
  

  {{% notice style="important" title="Using Proxy" %}} 
  you can run an addinational **daocloud** image to accelerate your pulling, check [Daocloud Proxy](daocloud/index.html)
  {{% /notice %}}


  <p> <b>1.init server </b></p> 

  {{% notice style="transparent" %}}
  ```bash

  ```
  {{% /notice %}}

{{< /tab >}}


{{< tab title="Argo Workflow" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/kubernetes/cluster/index.html" target="_blank">link</a> </p></br>
  2. Helm has installed, if not check 🔗<a href="/docs/software/binary/k8s_realted/index.html#helm" target="_blank">link</a> </p></br>
  3. ArgoCD has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  4. Argo Workflow has installed, if not check 🔗<a href="/docs/argo/argo-workflow/install_argoworkflow/index.html" target="_blank">link</a> </p></br>


  <p> <b>1.prepare `argocd-login-credentials` </b></p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl get namespaces database > /dev/null 2>&1 || kubectl create namespace database
  ```
  {{% /notice %}}


  <p> <b>2.apply rolebinding to k8s </b></p>

  {{% notice style="transparent" %}}
  ```yaml
  kubectl apply -f - <<EOF
  ---
  apiVersion: rbac.authorization.k8s.io/v1
  kind: ClusterRole
  metadata:
    name: application-administrator
  rules:
    - apiGroups:
        - argoproj.io
      resources:
        - applications
      verbs:
        - '*'
    - apiGroups:
        - apps
      resources:
        - deployments
      verbs:
        - '*'

  ---
  apiVersion: rbac.authorization.k8s.io/v1
  kind: RoleBinding
  metadata:
    name: application-administration
    namespace: argocd
  roleRef:
    apiGroup: rbac.authorization.k8s.io
    kind: ClusterRole
    name: application-administrator
  subjects:
    - kind: ServiceAccount
      name: argo-workflow
      namespace: business-workflows

  ---
  apiVersion: rbac.authorization.k8s.io/v1
  kind: RoleBinding
  metadata:
    name: application-administration
    namespace: application
  roleRef:
    apiGroup: rbac.authorization.k8s.io
    kind: ClusterRole
    name: application-administrator
  subjects:
    - kind: ServiceAccount
      name: argo-workflow
      namespace: business-workflows
  EOF
  ```
  
  {{% /notice %}}

  <p> <b>4.prepare `deploy-xxxx-flow.yaml` </b></p>

  {{% notice style="transparent" %}}
  ```yaml

  ```
  {{% /notice %}}


  <p> <b>6.subimit to argo workflow client</b></p> 

  {{% notice style="transparent" %}}
  ```bash
  argo -n business-workflows submit deploy-xxxx-flow.yaml
  ```
  {{% /notice %}}


  <p> <b>7.decode password</b></p> 

  {{% notice style="transparent" %}}
  ```bash
  kubectl -n application get secret xxxx-credentials -o jsonpath='{.data.xxx-password}' | base64 -d
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