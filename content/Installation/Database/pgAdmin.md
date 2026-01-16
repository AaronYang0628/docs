+++
title = 'Install PgAdmin'
date = 2025-03-07T15:00:59+08:00
weight = 161
+++


### 🚀Installation

{{< tabs groupid="xxxx" style="primary" title="Install By" icon="thumbtack" >}}

{{< tab title="📦Helm" style="transparent" >}}
  {{% include "content\Installation\SNIPPET\_helm_preliminary.md" %}}

  <p> <b>1.get helm repo </b></p>

  {{% notice style="transparent" %}}
  ```bash
  helm repo add runix https://helm.runix.net/
  helm repo update
  ```
  {{% /notice %}}

  <p> <b>2.install chart </b></p>

  {{% notice style="transparent" %}}
  ```bash
  helm install runix/pgadmin4 --generate-name --version 1.23.3
  ```
  {{% /notice %}}

  {{% notice style="important" title="Using AY Helm Mirror" %}} 
  {{% include "/Installation/SNIPPET/_helm_chart_mirror.md" %}}
  {{% /notice %}}

{{< /tab >}}

{{< tab title="🐙ArgoCD" style="transparent" >}}
  {{% include "content\Installation\SNIPPET\_argo_cd_preliminary.md" %}}

  <p> <b>1.prepare</b> `pgadmin-credentials.yaml` </p>

  {{% notice style="transparent" %}}
  ```yaml
  kubectl -n database create secret generic pgadmin-credentials \
    --from-literal=password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16)
  ```
  {{% /notice %}}

  <p> <b>2.prepare</b> `deploy-pgadmin.yaml` </p>

  {{% notice style="transparent" %}}
  ```yaml
  kubectl -n argocd apply -f -<< EOF
  apiVersion: argoproj.io/v1alpha1
  kind: Application
  metadata:
    name: pgadmin
  spec:
    syncPolicy:
      syncOptions:
      - CreateNamespace=true
    project: default
    source:
      repoURL: https://helm.runix.net/
      chart: pgadmin4
      targetRevision: 1.23.3
      helm:
        releaseName: pgadmin4
        values: |
          replicaCount: 1
          persistentVolume:
            enabled: false
          env:
            email: pgadmin@mail.72602.online
            variables:
              - name: PGADMIN_CONFIG_WTF_CSRF_ENABLED
                value: "False"
          existingSecret: pgadmin-credentials
          resources:
            requests:
              memory: 512Mi
              cpu: 500m
            limits:
              memory: 1024Mi
              cpu: 1000m
          image:
            registry: m.daocloud.io/docker.io
            pullPolicy: IfNotPresent
          ingress:
            enabled: true
            ingressClassName: nginx
            annotations:
              cert-manager.io/cluster-issuer: letsencrypt
            hosts:
              - host: pgadmin.72602.online
                paths:
                  - path: /
                    pathType: ImplementationSpecific
            tls:
              - secretName: pgadmin.72602.online-tls
                hosts:
                  - pgadmin.72602.online
    destination:
      server: https://kubernetes.default.svc
      namespace: database
  EOF
  ```
  {{% /notice %}}

  <p> <b>3.sync by argocd</b></p>

  {{% notice style="transparent" %}}
  ```bash
  argocd app sync argocd/pgadmin
  ```
  {{% /notice %}}

  {{% notice style="important" title="Using AY Helm Mirror" expanded="false" %}} 
  {{% include "/Installation/SNIPPET/_helm_chart_mirror.md" %}}
  {{% /notice %}}
  {{% notice style="important" title="Using AY ACR Image Mirror" expanded="false" %}} 
  {{% include "content\Installation\SNIPPET\_acr_image_mirror.md" %}}
  {{% /notice %}}
  {{% notice style="tip" title="Using DaoCloud Mirror" expanded="false" %}} 
  {{% include "content\Installation\SNIPPET\_daocloud_image_mirror.md" %}}
  {{% /notice %}}

{{< /tab >}}


{{< tab title="🐳Docker" style="transparent" >}}
  {{% include "content\Installation\SNIPPET\_container_preliminary.md" %}}

  <p> <b>1.init server </b></p> 

  {{% notice style="transparent" %}}
  ```bash

  ```
  {{% /notice %}}
  
  {{% notice style="important" title="Using AY ACR Image Mirror" expanded="false" %}} 
  {{% include "content\Installation\SNIPPET\_acr_image_mirror.md" %}}
  {{% /notice %}}
  {{% notice style="tip" title="Using DaoCloud Mirror" expanded="false" %}} 
  {{% include "content\Installation\SNIPPET\_daocloud_image_mirror.md" %}}
  {{% /notice %}}

{{< /tab >}}



{{< tab title="📑manifests" style="transparent" >}}
  {{% include "content\Installation\SNIPPET\_manifests_preliminary.md" %}}

  <p> <b>1.init server </b></p> 

  {{% notice style="transparent" %}}
  ```bash

  ```
  {{% /notice %}}
  
  {{% notice style="important" title="Using AY ACR Image Mirror" expanded="false" %}} 
  {{% include "content\Installation\SNIPPET\_acr_image_mirror.md" %}}
  {{% /notice %}}
  {{% notice style="tip" title="Using DaoCloud Mirror" expanded="false" %}} 
  {{% include "content\Installation\SNIPPET\_daocloud_image_mirror.md" %}}
  {{% /notice %}}

{{< /tab >}}


{{< /tabs >}}



### 🛎️FAQ

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