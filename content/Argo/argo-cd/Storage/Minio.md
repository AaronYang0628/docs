+++
tags = ["Minio"]
title = 'Install Minio'
date = 2024-03-07T15:00:59+08:00
weight = 20
+++

### Preliminary
- Kubernetes has installed, if not check [link](kubernetes/command/install/index.html)
- argoCD has installed, if not check [link](argo/argo-cd/install_argocd/index.html)
- ingres has installed on argoCD, if not [check link](argo/argo-cd/application/ingress/index.html)
- cert-manager has installed on argocd and the clusterissuer has a named `self-signed-ca-issuer`service, , if not check [link](argo/argo-cd/application/cert_manager/index.html)

### Steps
#### 1. prepare secret 
```shell
kubectl get namespaces storage > /dev/null 2>&1 || kubectl create namespace storage
kubectl -n storage create secret generic minio-secret \
    --from-literal=root-user=admin \
    --from-literal=root-password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16)
```
#### 2. prepare `minio.yaml`
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: minio
spec:
  syncPolicy:
    syncOptions:
    - CreateNamespace=true
  project: default
  source:
    repoURL: https://aaronyang0628.github.io/helm-chart-mirror/charts
    chart: minio
    targetRevision: 16.0.10
    helm:
      releaseName: minio
      values: |
        global:
          imageRegistry: "m.daocloud.io/docker.io"
          imagePullSecrets: []
          storageClass: ""
          security:
            allowInsecureImages: true
          compatibility:
            openshift:
              adaptSecurityContext: auto
        image:
          registry: m.daocloud.io/docker.io
          repository: bitnami/minio
        clientImage:
          registry: m.daocloud.io/docker.io
          repository: bitnami/minio-client
        mode: standalone
        defaultBuckets: ""
        auth:
          # rootUser: admin
          # rootPassword: ""
          existingSecret: "minio-secret"
        statefulset:
          updateStrategy:
            type: RollingUpdate
          podManagementPolicy: Parallel
          replicaCount: 1
          zones: 1
          drivesPerNode: 1
        resourcesPreset: "micro"
        resources: 
          requests:
            memory: 512Mi
            cpu: 250m
          limits:
            memory: 512Mi
            cpu: 250m
        ingress:
          enabled: true
          ingressClassName: "nginx"
          hostname: minio-console.dev.tech
          path: /?(.*)
          pathType: ImplementationSpecific
          annotations: 
            nginx.ingress.kubernetes.io/rewrite-target: /$1
          tls: true
          selfSigned: true
          extraHosts: []
        apiIngress:
          enabled: true
          ingressClassName: "nginx"
          hostname: minio-api.dev.tech
          path: /?(.*)
          pathType: ImplementationSpecific
          annotations: 
            nginx.ingress.kubernetes.io/rewrite-target: /$1
        persistence:
          enabled: false
          storageClass: ""
          mountPath: /bitnami/minio/data
          accessModes:
            - ReadWriteOnce
          size: 8Gi
          annotations: {}
          existingClaim: ""
        metrics:
          prometheusAuthType: public
          enabled: false
          serviceMonitor:
            enabled: false
            namespace: ""
            labels: {}
            jobLabel: ""
            paths:
              - /minio/v2/metrics/cluster
              - /minio/v2/metrics/node
            interval: 30s
            scrapeTimeout: ""
            honorLabels: false
          prometheusRule:
            enabled: false
            namespace: ""
            additionalLabels: {}
            rules: []
  destination:
    server: https://kubernetes.default.svc
    namespace: storage
```

#### 3. apply to k8s
```shell
kubectl -n argocd apply -f minio.yaml
```

#### 4. sync by argocd
```shell
argocd app sync argocd/minio
```

#### 5. visit web console
`minio-console.dev.tech` should be resolved to nginx-ingress

for example, add `$K8S_MASTER_IP minio-console.dev.tech` to `/etc/hosts`

address: `http://minio-console.dev.tech:32080/login`

> access key: `admin`

access secret could get from
```shell
kubectl -n storage get secret minio-secret -o jsonpath='{.data.root-password}' | base64 -d
```

#### 6. using mc
```shell
K8S_MASTER_IP=$(kubectl get node -l node-role.kubernetes.io/control-plane -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')
MINIO_ACCESS_SECRET=$(kubectl -n storage get secret minio-secret -o jsonpath='{.data.root-password}' | base64 -d)
podman run --rm \
    --entrypoint bash \
    --add-host=minio-api.dev.tech:10.200.60.64 \
    -it m.daocloud.io/docker.io/minio/mc:latest \
    -c "mc alias set minio http://minio-api.dev.tech:32080 admin ${MINIO_ACCESS_SECRET} \
        && mc ls minio \
        && mc mb --ignore-existing minio/test \
        && mc cp /etc/hosts minio/test/etc/hosts \
        && mc ls --recursive minio"
```