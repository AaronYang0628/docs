+++
title = 'Install Argo Event'
date = 2024-03-07T15:00:59+08:00
weight = 12
+++

### Preliminary
- Kubernets has installed, if not check 🔗[link](kubernetes/cluster/index.html)
- Argo CD has installed, if not check 🔗[link](software/cicd/argocd.html)


### 1. prepare `argo-events.yaml`

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: argo-events
spec:
  syncPolicy:
    syncOptions:
    - CreateNamespace=true
  project: default
  source:
    repoURL: https://argoproj.github.io/argo-helm
    chart: argo-events
    targetRevision: 2.4.2
    helm:
      releaseName: argo-events
      values: |
        openshift: false
        createAggregateRoles: true
        crds:
          install: true
          keep: true
        global:
          image:
            repository: m.daocloud.io/quay.io/argoproj/argo-events
        controller:
          replicas: 1
          resources: {}
        webhook:
          enabled: true
          replicas: 1
          port: 12000
          resources: {}
        extraObjects:
          - apiVersion: networking.k8s.io/v1
            kind: Ingress
            metadata:
              annotations:
                cert-manager.io/cluster-issuer: self-signed-ca-issuer
                nginx.ingress.kubernetes.io/rewrite-target: /$1
              labels:
                app.kubernetes.io/instance: argo-events
                app.kubernetes.io/managed-by: Helm
                app.kubernetes.io/name: argo-events-events-webhook
                app.kubernetes.io/part-of: argo-events
                argocd.argoproj.io/instance: argo-events
              name: argo-events-webhook
            spec:
              ingressClassName: nginx
              rules:
              - host: argo-events.webhook.ay.dev
                http:
                  paths:
                  - backend:
                      service:
                        name: events-webhook
                        port:
                          number: 12000
                    path: /?(.*)
                    pathType: ImplementationSpecific
              tls:
              - hosts:
                - argo-events.webhook.ay.dev
                secretName: argo-events-webhook-tls
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
```


### 4. apply to k8s
```shell
kubectl -n argocd apply -f argo-events.yaml
```

### 5. sync by argocd
```shell
argocd app sync argocd/argo-events
```
