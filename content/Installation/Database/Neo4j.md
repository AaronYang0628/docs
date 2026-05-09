+++
title = 'Install Neo4j'
date = 2024-03-07T15:00:59+08:00
weight = 140
+++


### Installation

{{< tabs groupid="prometheus" style="primary" title="Install By" icon="thumbtack" >}}

{{< tab title="Helm" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes is installed; if not, check 🔗<a href="/docs/kubernetes/cluster/index.html" target="_blank">link</a> </p></br>
  2. Helm is installed; if not, check 🔗<a href="/docs/Installation/binary/k8s_realted/index.html#helm" target="_blank">link</a> </p></br>

  <p> <b>1.get helm repo </b></p>

  {{% notice style="transparent" %}}
  ```bash
  helm repo add neo4j https://helm.neo4j.com/neo4j
  helm repo update
  ```
  {{% /notice %}}

  <p> <b>2.install chart </b></p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl get namespaces database > /dev/null 2>&1 || kubectl create namespace database

  helm upgrade --install neo4j neo4j/neo4j \
    --namespace database \
    --set neo4j.password=changeMe123 \
    --set volumes.data.mode=defaultStorageClass
  ```
  {{% /notice %}}

  {{% notice style="important" title="Chart Reference" %}} 
  for more information, you can check 🔗[https://artifacthub.io/packages/helm/neo4j/neo4j](https://artifacthub.io/packages/helm/neo4j/neo4j)
  {{% /notice %}}

{{< /tab >}}

{{< tab title="ArgoCD" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes is installed; if not, check 🔗<a href="/docs/kubernetes/cluster/index.html" target="_blank">link</a> </p></br>
  2. Helm is installed; if not, check 🔗<a href="/docs/Installation/binary/k8s_realted/index.html#helm" target="_blank">link</a> </p></br>
  3. ArgoCD is installed; if not, check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>

  <p> <b>1.prepare</b> `deploy-xxxxx.yaml` </p>

  {{% notice style="transparent" %}}
  ```yaml

  ```
  {{% /notice %}}

  <p> <b>2.apply to k8s</b></p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl -n argocd apply -f xxxx.yaml
  ```
  {{% /notice %}}

  <p> <b>3.sync by argocd</b></p>

  {{% notice style="transparent" %}}
  ```bash
  argocd app sync argocd/xxxx
  ```
  {{% /notice %}}

  <p> <b>4.prepare yaml-content.yaml</b></p>

  {{% notice style="transparent" %}}
  ```yaml
  

  ```
  {{% /notice %}}

  <p> <b>5.apply to k8s</b></p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl apply -f xxxx.yaml
  ```
  {{% /notice %}}

  <p> <b>6.apply xxxx.yaml directly</b></p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl apply -f - <<EOF
  
  EOF
  ```
  {{% /notice %}}

{{< /tab >}}


{{< tab title="Docker" style="transparent" >}}
 <p> <b>Preliminary </b></p>
  1. Docker|Podman|Buildah is installed; if not, check 🔗<a href="/docs/Installation/container/index.html" target="_blank">link</a> </p></br>
  

  {{% notice style="important" title="Using Proxy" %}} 
  you can run an addinational **daocloud** image to accelerate your pulling, check [Daocloud Proxy](daocloud/index.html)
  {{% /notice %}}


  <p> <b>1.init server </b></p> 

  {{% notice style="transparent" %}}
  ```bash
  mkdir -p neo4j/data
  podman run --rm \
      --name neo4j \
      -p 7474:7474 \
      -p 7687:7687 \
      -e neo4j_ROOT_PASSWORD=mysql \
      -v $(pwd)/neo4j/data:/data \
      -d docker.io/library/neo4j:5.18.0-community-bullseye
  ```
  {{% /notice %}}

  and then you can visit 🔗<a href="/docs/Installation/container/index.html" target="_blank">[http://localhost:7474]</a> </p></br>

  username: `root` </br>
  password: `mysql` </br>

{{< /tab >}}


{{< tab title="Argo Workflow" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes is installed; if not, check 🔗<a href="/docs/kubernetes/cluster/index.html" target="_blank">link</a> </p></br>
  2. Helm is installed; if not, check 🔗<a href="/docs/Installation/binary/k8s_realted/index.html#helm" target="_blank">link</a> </p></br>
  3. ArgoCD is installed; if not, check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  4. Argo Workflow is installed; if not, check 🔗<a href="/docs/argo/argo-workflow/install_argoworkflow/index.html" target="_blank">link</a> </p></br>


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


  <p> <b>6.submit to argo workflow client</b></p> 

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

