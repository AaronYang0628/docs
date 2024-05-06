+++
title = 'Install ElasticSearch'
date = 2024-04-12T15:00:59+08:00
weight = 7
+++

### Preliminary
- Kubernetes has installed, if not check [link](kubernetes/command/install/index.html)
- argoCD has installed, if not check [link](/argo/argo-cd/argocd/index.html)
- ingres has installed on argoCD, if not check [link](/argo/argo-cd/application/ingress/index.html)
- cert-manager has installed on argocd and the clusterissuer has a named `self-signed-ca-issuer`service, , if not check [link](/argo/argo-cd/application/cert_manager/index.html)

### Steps

#### 1. prepare `elastic-search.yaml`
{{< tabs >}}
  {{% tab title="minimal" %}}
```yaml
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
    targetRevision: 19.21.2
    helm:
      releaseName: elastic-search
      values: |
        global:
          kibanaEnabled: false
        clusterName: elastic
        image:
          registry: m.daocloud.io/docker.io
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
          hostname: elastic-search.dev.geekcity.tech
          ingressClassName: nginx
          path: /?(.*)
          tls: true
        master:
          masterOnly: false
          replicaCount: 1
          persistence:
            enabled: false
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
            registry: m.daocloud.io/docker.io
            pullPolicy: IfNotPresent
        volumePermissions:
          enabled: false
          image:
            registry: m.daocloud.io/docker.io
            pullPolicy: IfNotPresent
        sysctlImage:
          enabled: true
          registry: m.daocloud.io/docker.io
          pullPolicy: IfNotPresent
        kibana:
          elasticsearch:
            hosts:
              - '{{ include "elasticsearch.service.name" . }}'
            port: '{{ include "elasticsearch.service.ports.restAPI" . }}'
  destination:
    server: https://kubernetes.default.svc
    namespace: application
```
  {{% /tab  %}}

  {{% tab title="normal" %}}
```yaml
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
    targetRevision: 19.21.2
    helm:
      releaseName: elastic-search
      values: |
        global:
          kibanaEnabled: false
        clusterName: elastic
        image:
          registry: m.daocloud.io/docker.io
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
          hostname: elastic-search.dev.geekcity.tech
          ingressClassName: nginx
          path: /?(.*)
          tls: true
        master:
          masterOnly: true
          replicaCount: 2
          persistence:
            enabled: false
        data:
          replicaCount: 2
          persistence:
            enabled: false
        coordinating:
          replicaCount: 2
        ingest:
          enabled: true
          replicaCount: 2
          service:
            enabled: false
            type: ClusterIP
          ingress:
            enabled: false
        metrics:
          enabled: false
          image:
            registry: m.daocloud.io/docker.io
            pullPolicy: IfNotPresent
        volumePermissions:
          enabled: false
          image:
            registry: m.daocloud.io/docker.io
            pullPolicy: IfNotPresent
        sysctlImage:
          enabled: true
          registry: m.daocloud.io/docker.io
          pullPolicy: IfNotPresent
        kibana:
          elasticsearch:
            hosts:
              - '{{ include "elasticsearch.service.name" . }}'
            port: '{{ include "elasticsearch.service.ports.restAPI" . }}'
  destination:
    server: https://kubernetes.default.svc
    namespace: application
```
  {{% /tab  %}}
{{< /tabs >}}




#### 3. apply to k8s
```shell
kubectl -n argocd apply -f elastic-search.yaml
```

#### 4. sync by argocd
```shell
argocd app sync argocd/elastic-search
```

#### [[Optional]]() Test REST API call
> add `$K8S_MASTER_IP elastic-search.dev.geekcity.tech` to `/etc/hosts`

```shell
curl -k "http://elastic-search.dev.geekcity.tech:32443/?pretty"
```

#### [[Optional]]() Add Single Document
```shell
curl -k -H "Content-Type: application/json" \
    -X POST "http://elastic-search.dev.geekcity.tech:32443/books/_doc?pretty" \
    -d '{"name": "Snow Crash", "author": "Neal Stephenson", "release_date": "1992-06-01", "page_count": 470}'
```