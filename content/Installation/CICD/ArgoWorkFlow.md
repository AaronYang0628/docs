+++
title = 'Install Argo WorkFlow'
date = 2024-03-07T15:00:59+08:00
weight = 11
+++

### Preliminary
- Kubernets has installed, if not check 🔗[link](kubernetes/cluster/index.html)
- Argo CD has installed, if not check 🔗[link](Installation/cicd/argocd.html)
- cert-manager has installed on argocd and the clusterissuer has a named `self-signed-ca-issuer`service, , if not check 🔗[link](Installation/application/cert_manager.html)

### 1. prepare `argo-workflows.yaml`

{{< tabs title="content" >}}
{{% tab title="yaml" %}}
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: argo-workflows
spec:
  syncPolicy:
    syncOptions:
    - CreateNamespace=true
  project: default
  source:
    repoURL: https://aaronyang0628.github.io/helm-chart-mirror/charts
    chart: argo-workflows
    targetRevision: 0.40.11
    helm:
      releaseName: argo-workflows
      values: |
        crds:
          install: true
          keep: false
        singleNamespace: false
        controller:
          image:
            registry: m.daocloud.io/quay.io
          workflowNamespaces:
            - business-workflows
        executor:
          image:
            registry: m.daocloud.io/quay.io
        workflow:
          serviceAccount:
            create: true
          rbac:
            create: true
        server:
          enabled: true
          image:
            registry: m.daocloud.io/quay.io
          ingress:
            enabled: true
            ingressClassName: nginx
            annotations:
              cert-manager.io/cluster-issuer: self-signed-ca-issuer
              nginx.ingress.kubernetes.io/rewrite-target: /$1
            hosts:
              - argo-workflows.ay.dev
            paths:
              - /?(.*)
            pathType: ImplementationSpecific
            tls:
              - secretName: argo-workflows-tls
                hosts:
                  - argo-workflows.ay.dev
          authModes:
            - server
          sso:
            enabled: false
  destination:
    server: https://kubernetes.default.svc
    namespace: workflows
```
{{% /tab %}}
{{% tab title="shortcut" %}}
```yaml
kubectl -n argocd apply -f - << EOF
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: argo-workflows
spec:
  syncPolicy:
    syncOptions:
    - CreateNamespace=true
  project: default
  source:
    repoURL: https://argoproj.github.io/argo-helm
    chart: argo-workflows
    targetRevision: 0.45.11
    helm:
      releaseName: argo-workflows
      values: |
        crds:
          install: true
          keep: false
        singleNamespace: false
        controller:
          image:
            registry: m.daocloud.io/quay.io
          workflowNamespaces:
            - business-workflows
        executor:
          image:
            registry: m.daocloud.io/quay.io
        workflow:
          serviceAccount:
            create: true
          rbac:
            create: true
        server:
          enabled: true
          image:
            registry: m.daocloud.io/quay.io
          ingress:
            enabled: true
            ingressClassName: nginx
            annotations:
              cert-manager.io/cluster-issuer: self-signed-ca-issuer
              nginx.ingress.kubernetes.io/rewrite-target: /$1
              nginx.ingress.kubernetes.io/use-regex: "true"
            hosts:
              - argo-workflows.ay.dev
            paths:
              - /?(.*)
            pathType: ImplementationSpecific
            tls:
              - secretName: argo-workflows.ay.dev-tls
                hosts:
                  - argo-workflows.ay.dev
          authModes:
            - server
            - client
          sso:
            enabled: false
  destination:
    server: https://kubernetes.default.svc
    namespace: workflows
EOF
```
{{% /tab %}}
{{< /tabs >}}



### 2. install argo workflow binary

{{% include file="Content\Installation\Binary\argo.md" %}}

### 3. create workflow related namespace
```yaml
kubectl get namespace business-workflows > /dev/null 2>&1 || kubectl create namespace business-workflows
```


### 4. apply to k8s
```shell
kubectl -n argocd apply -f argo-workflows.yaml
```

### 5. sync by argocd
```shell
argocd app sync argocd/argo-workflows
```

### 6. check workflow status
```shell
# list all flows
argo -n business-workflows list
```

```shell
# get specific flow status
argo -n business-workflows get <$flow_name>
```

```shell
# get specific flow log
argo -n business-workflows logs <$flow_name>
```

```shell
# get specific flow log continuously
argo -n business-workflows logs <$flow_name> --watch
```
