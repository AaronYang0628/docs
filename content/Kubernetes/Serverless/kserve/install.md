+++
title = 'Install Kserve'
date = 2024-03-07T15:00:59+08:00
weight = 1
+++

## Preliminary
- v 1.30 + Kubernetes has installed, if not check 🔗[link](kubernetes/cluster/index.html)
- Helm has installed, if not check 🔗[link](Installation/binary/helm/index.html)


### Installation

{{< tabs groupid="kserve" style="primary" title="Install By" icon="thumbtack" >}}

{{< tab title="Shell" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  2. Helm binary has installed, if not check 🔗<a href="/docs/Installation/binary/helm/index.html" target="_blank">link</a> </p></br>

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
  2. ArgoCD has installed, if not check 🔗<a href="/docs/Installation/cicd/argocd//index.html" target="_blank">link</a> </p></br>
  3. Helm binary has installed, if not check 🔗<a href="/docs/Installation/binary/helm/index.html" target="_blank">link</a> </p></br>

  <p> <b>1.install gateway API CRDs </b></p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.3.0/standard-install.yaml
  ```
  {{% /notice %}}


  <p> <b>2.install cert manager </b></p>
  
  {{% notice style="important" title="Reference" %}} 
  following 🔗[link](/docs/Installation/application/cert_manager/index.html) to install cert manager
  {{% /notice %}}

  <p> <b>3.install istio system </b></p>

  {{% notice style="important" title="Reference" %}} 
  following 🔗[link](/docs/Installation/networking/istio/index.html) to install three istio components (istio-base, istiod, istio-ingressgateway)
  {{% /notice %}}

  <p> <b>4.install Knative Operator </b></p>

  {{% notice style="transparent" %}}
  ```yaml
  kubectl -n argocd apply -f - << EOF
  apiVersion: argoproj.io/v1alpha1
  kind: Application
  metadata:
    name: knative-operator
  spec:
    syncPolicy:
      syncOptions:
      - CreateNamespace=true
    project: default
    source:
      repoURL: https://knative.github.io/operator
      chart: knative-operator
      targetRevision: v1.18.1
      helm:
        releaseName: knative-operator
        values: |
          knative_operator:
            knative_operator:
              image: m.daocloud.io/gcr.io/knative-releases/knative.dev/operator/cmd/operator
              tag: v1.18.1
              resources:
                requests:
                  cpu: 100m
                  memory: 100Mi
                limits:
                  cpu: 1000m
                  memory: 1000Mi
            operator_webhook:
              image: m.daocloud.io/gcr.io/knative-releases/knative.dev/operator/cmd/webhook
              tag: v1.18.1
              resources:
                requests:
                  cpu: 100m
                  memory: 100Mi
                limits:
                  cpu: 500m
                  memory: 500Mi
    destination:
      server: https://kubernetes.default.svc
      namespace: knative-serving
  EOF
  ```
  {{% /notice %}}

  <p> <b>5.sync by argocd</b></p>

  {{% notice style="transparent" %}}
  ```bash
  argocd app sync argocd/knative-operator
  ```
  {{% /notice %}}

  <p> <b>6.install kserve serving CRD </b></p>


  {{< highlight hl_lines="8 11"  type="yaml" >}}
  kubectl apply -f - <<EOF
  apiVersion: operator.knative.dev/v1beta1
  kind: KnativeServing
  metadata:
    name: knative-serving
    namespace: knative-serving
  spec:
    version: 1.18.0 # this is knative serving version
    config:
      domain:
        example.com: ""
  EOF
  {{< /highlight >}}

  {{% notice style="transparent" %}}
  ```bash

  ```
  {{% /notice %}}

  <p> <b>7.install kserve CRD </b></p>

  {{% notice style="transparent" %}}
  ```yaml
  kubectl -n argocd apply -f - << EOF
  apiVersion: argoproj.io/v1alpha1
  kind: Application
  metadata:
    name: kserve-crd
    annotations:
      argocd.argoproj.io/sync-options: ServerSideApply=true
      argocd.argoproj.io/compare-options: IgnoreExtraneous
  spec:
    syncPolicy:
      syncOptions:
      - CreateNamespace=true
      - ServerSideApply=true
    project: default
    source:
      repoURL: https://aaronyang0628.github.io/helm-chart-mirror/charts
      chart: kserve-crd
      targetRevision: v0.15.2
      helm:
        releaseName: kserve-crd 
    destination:
      server: https://kubernetes.default.svc
      namespace: kserve
  EOF
  ```
  {{% /notice %}}

  {{% notice style="tip" title="Expectd Output" icon="check" expanded="false"%}}

  ```plaintext
  knative-serving    activator-cbf5b6b55-7gw8s                                 Running        116s
  knative-serving    autoscaler-c5d454c88-nxrms                                Running        115s
  knative-serving    autoscaler-hpa-6c966695c6-9ld24                           Running        113s
  knative-serving    cleanup-serving-serving-1.18.0-45nhg                      Completed      113s
  knative-serving    controller-84f96b7676-jjqfp                               Running        115s
  knative-serving    net-istio-controller-574679cd5f-2sf4d                     Running        112s
  knative-serving    net-istio-webhook-85c99487db-mmq7n                        Running        111s
  knative-serving    storage-version-migration-serving-serving-1.18.0-k28vf    Completed      113s
  knative-serving    webhook-75d4fb6db5-qqcwz                                  Running        114s
  ```

  {{% /notice %}}


  <p> <b>8.sync by argocd</b></p>

  {{% notice style="transparent" %}}
  ```bash
  argocd app sync argocd/kserve-crd
  ```
  {{% /notice %}}

  <p> <b>9.install kserve Controller </b></p>

  {{% notice style="transparent" %}}
  ```yaml
  kubectl -n argocd apply -f - << EOF
  apiVersion: argoproj.io/v1alpha1
  kind: Application
  metadata:
    name: kserve
    annotations:
      argocd.argoproj.io/sync-options: ServerSideApply=true
      argocd.argoproj.io/compare-options: IgnoreExtraneous
  spec:
    syncPolicy:
      syncOptions:
      - CreateNamespace=true
      - ServerSideApply=true
    project: default
    source:
      repoURL: https://aaronyang0628.github.io/helm-chart-mirror/charts
      chart: kserve
      targetRevision: v0.15.2
      helm:
        releaseName: kserve
        values: |
          kserve:
            agent:
              image: m.daocloud.io/docker.io/kserve/agent
            router:
              image: m.daocloud.io/docker.io/kserve/router
            storage:
              image: m.daocloud.io/docker.io/kserve/storage-initializer
              s3:
                accessKeyIdName: AWS_ACCESS_KEY_ID
                secretAccessKeyName: AWS_SECRET_ACCESS_KEY
                endpoint: ""
                region: ""
                verifySSL: ""
                useVirtualBucket: ""
                useAnonymousCredential: ""
            controller:
              deploymentMode: "Serverless"
              rbacProxyImage: m.daocloud.io/quay.io/brancz/kube-rbac-proxy:v0.18.0
              rbacProxy:
                resources:
                  limits:
                    cpu: 100m
                    memory: 300Mi
                  requests:
                    cpu: 100m
                    memory: 300Mi
              gateway:
                domain: example.com
              image: m.daocloud.io/docker.io/kserve/kserve-controller
              resources:
                limits:
                  cpu: 100m
                  memory: 300Mi
                requests:
                  cpu: 100m
                  memory: 300Mi
            servingruntime:
              tensorflow:
                image: tensorflow/serving
                tag: 2.6.2
              mlserver:
                image: m.daocloud.io/docker.io/seldonio/mlserver
                tag: 1.5.0
              sklearnserver:
                image: m.daocloud.io/docker.io/kserve/sklearnserver
              xgbserver:
                image: m.daocloud.io/docker.io/kserve/xgbserver
              huggingfaceserver:
                image: m.daocloud.io/docker.io/kserve/huggingfaceserver
                devShm:
                  enabled: false
                  sizeLimit: ""
                hostIPC:
                  enabled: false
              huggingfaceserver_multinode:
                shm:
                  enabled: true
                  sizeLimit: "3Gi"
              tritonserver:
                image: nvcr.io/nvidia/tritonserver
              pmmlserver:
                image: m.daocloud.io/docker.io/kserve/pmmlserver
              paddleserver:
                image: m.daocloud.io/docker.io/kserve/paddleserver
              lgbserver:
                image: m.daocloud.io/docker.io/kserve/lgbserver
              torchserve:
                image: pytorch/torchserve-kfs
                tag: 0.9.0
              art:
                image: m.daocloud.io/docker.io/kserve/art-explainer
            localmodel:
              enabled: false
              controller:
                image: m.daocloud.io/docker.io/kserve/kserve-localmodel-controller
              jobNamespace: kserve-localmodel-jobs
              agent:
                hostPath: /mnt/models
                image: m.daocloud.io/docker.io/kserve/kserve-localmodelnode-agent
            inferenceservice:
              resources:
                limits:
                  cpu: "1"
                  memory: "2Gi"
                requests:
                  cpu: "1"
                  memory: "2Gi"
    destination:
      server: https://kubernetes.default.svc
      namespace: kserve
  EOF
  ```
  {{% /notice %}}


  {{% notice style="caution" title="if you have 'failed calling webhook ...' " icon="hand" expanded="false"%}}

  ```plaintext
  Internal error occurred: failed calling webhook "clusterservingruntime.kserve-webhook-server.validator": failed to call webhook: Post "https://kserve-webhook-server-service.kserve.svc:443/validate-serving-kserve-io-v1alpha1-clusterservingruntime?timeout=10s": no endpoints available for service "kserve-webhook-server-service"                               Running        114s
  ```

  Just wait for a while and the resync, and it will be fine.

  {{% /notice %}}
  


  <p> <b>10.sync by argocd</b></p>

  {{% notice style="transparent" %}}
  ```bash
  argocd app sync argocd/kserve
  ```
  {{% /notice %}}


  <p> <b>11.install kserve eventing CRD</b></p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl apply -f https://github.com/knative/eventing/releases/download/knative-v1.18.1/eventing-crds.yaml
  ```
  {{% /notice %}}


  <p> <b>12.install kserve eventing</b></p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl apply -f https://github.com/knative/eventing/releases/download/knative-v1.18.1/eventing-core.yaml
  ```
  {{% /notice %}}
  
  {{% notice style="tip" title="Expectd Output" icon="check" expanded="false"%}}

  ```plaintext
  knative-eventing   eventing-controller-cc45869cd-fmhg8        1/1     Running       0          3m33s
  knative-eventing   eventing-webhook-67fcc6959b-lktxd          1/1     Running       0          3m33s
  knative-eventing   job-sink-7f5d754db-tbf2z                   1/1     Running       0          3m33s
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