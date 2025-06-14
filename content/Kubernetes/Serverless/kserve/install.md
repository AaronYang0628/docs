+++
title = 'Install Kserve'
date = 2024-03-07T15:00:59+08:00
weight = 1
+++

## Preliminary
- v 1.30 + Kubernetes has installed, if not check 🔗[link](kubernetes/command/install/index.html)
- Helm has installed, if not check 🔗[link](kubernetes/command/install/index.html)


### Installation

{{< tabs groupid="kserve" style="primary" title="Install By" icon="thumbtack" >}}

{{< tab title="Shell" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  2. Helm has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>

  <p> <b>1.install from script directly</b></p>

  {{% notice style="transparent" %}}
  ```bash
  curl -s "https://raw.githubusercontent.com/kserve/kserve/release-0.15/hack/quick_install.sh" | bash
  ```
  {{% /notice %}}

  {{% notice tip "Expectd Output" "check" %}}
  Installing Gateway API CRDs ...

  ...

  😀 Successfully installed Istio

  😀 Successfully installed Cert Manager

  😀 Successfully installed Knative
  {{% /notice %}}

  But you probably will ecounter some error due to the network, like this:

  {{% expand title="Error: INSTALLATION FAILED: context deadline exceeded" %}}
  you need to reinstall some components
  ```bash
  export KSERVE_VERSION=v0.15.2
  export deploymentMode=Serverless
  helm upgrade --namespace kserve kserve-crd oci://ghcr.io/kserve/charts/kserve-crd --version $KSERVE_VERSION
  helm upgrade --namespace kserve kserve oci://ghcr.io/kserve/charts/kserve --version $KSERVE_VERSION --set-string kserve.controller.deploymentMode="$deploymentMode"
  # helm upgrade knative-operator --namespace knative-serving  https://github.com/knative/operator/releases/download/knative-v1.15.7/knative-operator-v1.15.7.tgz
  ```
  {{% /expand %}}

{{< /tab >}}


{{< tab title="Steps" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. If you have <b>only one node</b> in your cluster, you need at least <b>6 CPUs, 6 GB of memory, and 30 GB of disk storage.</b> </p></br>
  2. If you have multiple nodes in your cluster, for each node you need at least 2 CPUs, 4 GB of memory, and 20 GB of disk storage. </p></br>

  <p> <b>1.install knative serving CRD resources</b></p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl apply -f https://github.com/knative/serving/releases/download/knative-v1.18.0/serving-crds.yaml
  ```
  {{% /notice %}}

  <p> <b>2.install knative serving components</b></p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl apply -f https://github.com/knative/serving/releases/download/knative-v1.18.0/serving-core.yaml
  # kubectl apply -f https://raw.githubusercontent.com/AaronYang0628/assets/refs/heads/main/knative/serving/release/download/knative-v1.18.0/serving-core.yaml
  ```
  {{% /notice %}}

  <p> <b>3.install network layer Istio</b></p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl apply -l knative.dev/crd-install=true -f https://github.com/knative/net-istio/releases/download/knative-v1.18.0/istio.yaml
  kubectl apply -f https://github.com/knative/net-istio/releases/download/knative-v1.18.0/istio.yaml
  kubectl apply -f https://github.com/knative/net-istio/releases/download/knative-v1.18.0/net-istio.yaml
  ```
  {{% /notice %}}

  {{% notice style="tip" title="Expectd Output" icon="check" expanded="false"%}}
  Monitor the Knative components until all of the components show a STATUS of Running or Completed.

  ```plaintext
  kubectl get pods -n knative-serving

  #NAME                                      READY   STATUS    RESTARTS   AGE
  #3scale-kourier-control-54cc54cc58-mmdgq   1/1     Running   0          81s
  #activator-67656dcbbb-8mftq                1/1     Running   0          97s
  #autoscaler-df6856b64-5h4lc                1/1     Running   0          97s
  #controller-788796f49d-4x6pm               1/1     Running   0          97s
  #domain-mapping-65f58c79dc-9cw6d           1/1     Running   0          97s
  #domainmapping-webhook-cc646465c-jnwbz     1/1     Running   0          97s
  #webhook-859796bc7-8n5g2                   1/1     Running   0          96s
  ```

  {{% /notice %}}

  {{% notice style="tip" title="Check Knative Hello World" icon="check" expanded="false"%}}

  asdasda

  https://knative.dev/docs/install/yaml-install/serving/install-serving-with-yaml/#configure-dns

  {{% /notice %}}

  <p> <b>4.install cert manager</b></p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.17.2/cert-manager.yaml
  ```
 {{% /notice %}}

 <p> <b>5.install kserve</b></p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl apply --server-side -f https://github.com/kserve/kserve/releases/download/v0.15.0/kserve.yaml
  kubectl apply --server-side -f https://github.com/kserve/kserve/releases/download/v0.15.0/kserve-cluster-resources.yaml
  ```
  {{% /notice %}}
  

  {{% notice style="important" title="Reference" %}} 
  for more information, you can check 🔗[https://artifacthub.io/packages/helm/prometheus-community/prometheus](https://artifacthub.io/packages/helm/prometheus-community/prometheus)
  {{% /notice %}}

{{< /tab >}}

{{< tab title="ArgoCD" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/kubernetes/cluster/index.html" target="_blank">link</a> </p></br>
  2. ArgoCD has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  3. Helm binary has installed, if not check 🔗<a href="/docs/software/binary/helm/index.html" target="_blank">link</a> </p></br>

  <p> <b>1.install gateway API CRDs </b></p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.3.0/standard-install.yaml
  ```
  {{% /notice %}}


  <p> <b>2.install cert manager </b></p>
  
  {{% notice style="important" title="Reference" %}} 
  following 🔗[link](/docs/software/application/cert_manager/index.html) to install cert manager
  {{% /notice %}}

  <p> <b>3.install cert manager </b></p>


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