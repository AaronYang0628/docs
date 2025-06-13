+++
tags = ["Minio"]
title = 'Install Minio'
date = 2024-03-07T15:00:59+08:00
weight = 90
+++


### Installation

{{< tabs groupid="prometheus" style="primary" title="Install By" icon="thumbtack" >}}

{{< tab title="Helm" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  2. Helm has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>

{{< /tab >}}

{{< tab title="ArgoCD" style="transparent">}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  2. argoCD has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  3. ingres has installed on argoCD, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  4. cert-manager has installed on argocd and the clusterissuer has a named `self-signed-ca-issuer`service, , if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>

  <p> <b>1.prepare minio credentials secret </b></p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl get namespaces storage > /dev/null 2>&1 || kubectl create namespace storage
  kubectl -n storage create secret generic minio-secret \
      --from-literal=root-user=admin \
      --from-literal=root-password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16)
  ```
  {{% /notice %}}

  <p> <b>2.prepare `deploy-minio.yaml` </b></p>

  {{% notice style="transparent" %}}
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
  {{% /notice %}}


  <p> <b>3.deploy minio </b></p>
  {{% notice style="transparent" %}}
  ```bash
  kubectl -n argocd apply -f deploy-minio.yaml
  ```
  {{% /notice %}}

  <p> <b>4.sync by argocd </b></p>

  {{% notice style="transparent" %}}
  ```bash
  argocd app sync argocd/minio
  ```
  {{% /notice %}}

  <p> <b>5.decode minio secret </b></p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl -n storage get secret minio-secret -o jsonpath='{.data.root-password}' | base64 -d
  ```
  {{% /notice %}}

  <p> <b>5.visit web console </b></p>

  `minio-console.dev.tech` should be resolved to nginx-ingress </br>

  for example, add `$K8S_MASTER_IP minio-console.dev.tech` to `/etc/hosts` </br>

  address: `http://minio-console.dev.tech:32080/login` </br>

  > access key: `admin` </br>

  <p> <b>6.using mc </b></p>

  {{% notice style="transparent" %}}
  ```bash
  K8S_MASTER_IP=$(kubectl get node -l node-role.kubernetes.io/control-plane -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')
  MINIO_ACCESS_SECRET=$(kubectl -n storage get secret minio-secret -o jsonpath='{.data.root-password}' | base64 -d)
  podman run --rm \
      --entrypoint bash \
      --add-host=minio-api.dev.tech:${K8S_MASTER_IP} \
      -it m.daocloud.io/docker.io/minio/mc:latest \
      -c "mc alias set minio http://minio-api.dev.tech:32080 admin ${MINIO_ACCESS_SECRET} \
          && mc ls minio \
          && mc mb --ignore-existing minio/test \
          && mc cp /etc/hosts minio/test/etc/hosts \
          && mc ls --recursive minio"
  ```
  {{% /notice %}}




{{< /tab >}}


{{< tab title="Docker Compose" style="default" >}}
  <p> <b>Preliminary </b></p>
  1. Docker has installed, if not check 🔗<a href="docs/software/container/docker/index.html" target="_blank">link</a> </p></br>
   

  {{% notice style="important" title="Using Proxy" %}} 
  you can run an addinational **daocloud** image to accelerate your pulling, check [Daocloud Proxy](daocloud/index.html)
  {{% /notice %}}

  <p> <b>1.init server </b></p>

  {{% notice style="transparent" %}}
  ```bash
  mkdir -p $(pwd)/minio/data
  podman run --rm \
      --name minio-server \
      -p 9000:9000 \
      -p 9001:9001 \
      -v $(pwd)/minio/data:/data \
      -d docker.io/minio/minio:latest server /data --console-address :9001
  ```
  {{% /notice %}}

  <p> <b>2.use web console </b></p>
  And then you can visit 🔗<a href="http://localhost:9001" target="_blank">http://localhost:9001</a>

  <p> username: `minioadmin`  </p>
  <p> password: `minioadmin`  </p>

  <p> <b>3.use internal client  </b></p>

  {{% notice style="transparent" %}}
  ```bash
  podman run --rm \
      --entrypoint bash \
      -it docker.io/minio/mc:latest \
      -c "mc alias set minio http://host.docker.internal:9000 minioadmin minioadmin \
          && mc ls minio \
          && mc mb --ignore-existing minio/test \
          && mc cp /etc/hosts minio/test/etc/hosts \
          && mc ls --recursive minio"
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