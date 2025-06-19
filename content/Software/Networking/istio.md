+++
tags = ["Istio"]
title = 'Install Istio'
date = 2024-06-07T15:00:59+08:00
weight = 1
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

  <p> <b>1.prepare</b> `deploy-istio-base.yaml` </p>

  {{% notice style="transparent" %}}
  ```yaml
  kubectl -n argocd apply -f - << EOF
  apiVersion: argoproj.io/v1alpha1
  kind: Application
  metadata:
    name: istio-base
  spec:
    syncPolicy:
      syncOptions:
      - CreateNamespace=true
    project: default
    source:
      repoURL: https://istio-release.storage.googleapis.com/charts
      chart: base
      targetRevision: 1.23.2
      helm:
        releaseName: istio-base
        values: |
          defaults:
            global:
              istioNamespace: istio-system
            base:
              enableCRDTemplates: false
              enableIstioConfigCRDs: true
            defaultRevision: "default"
    destination:
      server: https://kubernetes.default.svc
      namespace: istio-system
  EOF
  ```
  {{% /notice %}}

  <p> <b>2.sync by argocd</b></p>

  {{% notice style="transparent" %}}
  ```bash
  argocd app sync argocd/istio-base
  ```
  {{% /notice %}}

  <p> <b>3.prepare</b> `deploy-istiod.yaml` </p>

  {{% notice style="transparent" %}}
  ```yaml
  kubectl -n argocd apply -f - << EOF
  apiVersion: argoproj.io/v1alpha1
  kind: Application
  metadata:
    name: istiod
  spec:
    syncPolicy:
      syncOptions:
      - CreateNamespace=true
    project: default
    source:
      repoURL: https://istio-release.storage.googleapis.com/charts
      chart: istiod
      targetRevision: 1.23.2
      helm:
        releaseName: istiod
        values: |
          defaults:
            global:
              istioNamespace: istio-system
              defaultResources:
                requests:
                  cpu: 10m
                  memory: 128Mi
                limits:
                  cpu: 100m
                  memory: 128Mi
              hub: m.daocloud.io/docker.io/istio
              proxy:
                autoInject: disabled
                resources:
                  requests:
                    cpu: 100m
                    memory: 128Mi
                  limits:
                    cpu: 2000m
                    memory: 1024Mi
            pilot:
              autoscaleEnabled: true
              resources:
                requests:
                  cpu: 500m
                  memory: 2048Mi
              cpu:
                targetAverageUtilization: 80
              podAnnotations:
                cluster-autoscaler.kubernetes.io/safe-to-evict: "true"
    destination:
      server: https://kubernetes.default.svc
      namespace: istio-system
  EOF
  ```
  {{% /notice %}}

  <p> <b>4.sync by argocd</b></p>

  {{% notice style="transparent" %}}
  ```bash
  argocd app sync argocd/istiod
  ```
  {{% /notice %}}

  <p> <b>5.prepare</b> `deploy-istio-ingressgateway.yaml` </p>

  {{% notice style="transparent" %}}
  ```yaml
  kubectl -n argocd apply -f - << EOF
  apiVersion: argoproj.io/v1alpha1
  kind: Application
  metadata:
    name: istio-ingressgateway
  spec:
    syncPolicy:
      syncOptions:
      - CreateNamespace=true
    project: default
    source:
      repoURL: https://istio-release.storage.googleapis.com/charts
      chart: gateway
      targetRevision: 1.23.2
      helm:
        releaseName: gateway
        values: |
          defaults:
            replicaCount: 1
            podAnnotations:
              inject.istio.io/templates: "gateway"
              sidecar.istio.io/inject: "true"
              cluster-autoscaler.kubernetes.io/safe-to-evict: "true"
            resources:
              requests:
                cpu: 100m
                memory: 128Mi
              limits:
                cpu: 2000m
                memory: 1024Mi
            service:
              type: ClusterIP
              ports:
              - name: status-port
                port: 15021
                protocol: TCP
                targetPort: 15021
              - name: http2
                port: 80
                protocol: TCP
                targetPort: 80
              - name: https
                port: 443
                protocol: TCP
                targetPort: 443
            autoscaling:
              enabled: true
              minReplicas: 1
              maxReplicas: 5
    destination:
      server: https://kubernetes.default.svc
      namespace: istio-system
  EOF
  ```
  {{% /notice %}}

  <p> <b>6.sync by argocd</b></p>

  {{% notice style="transparent" %}}
  ```bash
  argocd app sync argocd/istio-ingressgateway
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