+++
title = 'Install Superset'
date = 2026-05-07T15:00:59+08:00
draft = false
weight = 190
+++


### 🚀Installation

{{< tabs groupid="xxxx" style="primary" title="Install By" icon="thumbtack" >}}

{{< tab title="📦Helm" style="transparent" >}}
  {{% include "content\Installation\SNIPPET\_helm_preliminary.md" %}}

  <p> <b>1.get helm repo </b></p>

  {{% notice style="transparent" %}}
  ```bash
  helm repo add xxxxx https://xxxx
  helm repo update
  ```
  {{% /notice %}}

  <p> <b>2.install chart </b></p>

  {{% notice style="transparent" %}}
  ```bash
  helm install xxxxx/chart-name --generate-name --version a.b.c
  ```
  {{% /notice %}}

  {{% notice style="important" title="Using AY Helm Mirror" %}} 
  {{% include "/Installation/SNIPPET/_helm_chart_mirror.md" %}}
  {{% /notice %}}

{{< /tab >}}

{{< tab title="🐙ArgoCD" style="transparent" >}}
  {{% include "content\Installation\SNIPPET\_argo_cd_preliminary.md" %}}
  4. Postgresql is installed; if not, check 🔗<a href="/docs/Installation/database/postgresql/index.html" target="_blank">link</a> </p></br>
  5. Redis is installed; if not, check 🔗<a href="/docs/Installation/database/redis/index.html" target="_blank">link</a> </p></br>

  <p> <b>1.prepare</b> `superset-external-env` </p>

  {{% notice style="transparent" %}}
  ```shell
  kubectl create secret generic superset-external-env -n database \
  --from-literal=DB_HOST=postgresql.database.svc.cluster.local \
  --from-literal=DB_PORT=5432 \
  --from-literal=DB_USER=n8n \
  --from-literal=DB_PASS=REPLACE_DB_PASSWORD \
  --from-literal=DB_NAME=superset \
  --from-literal=REDIS_HOST=redis-master.database.svc.cluster.local \
  --from-literal=REDIS_PORT=6379 \
  --from-literal=REDIS_USER= \
  --from-literal=REDIS_PASSWORD=REPLACE_REDIS_PASSWORD \
  --from-literal=REDIS_PROTO=redis \
  --from-literal=REDIS_DB=1 \
  --from-literal=REDIS_CELERY_DB=0 \
  --from-literal=SUPERSET_SECRET_KEY=REPLACE_SUPERSET_SECRET_KEY \
  --from-literal=SUPERSET_ADMIN_PASSWORD=REPLACE_SUPERSET_ADMIN_PASSWORD
  ```
  {{% /notice %}}

  <p> <b>2.prepare</b> `deploy-superset.yaml` </p>

{{< tabs >}}

{{< tab title="ZJ" style="transparent" >}}

  {{% notice style="transparent" %}}
  ```yaml
  kubectl -n argocd apply -f -<<EOF
  apiVersion: argoproj.io/v1alpha1
  kind: Application
  metadata:
    name: superset
  spec:
    syncPolicy:
      automated:
        prune: true
        selfHeal: true
      syncOptions:
        - CreateNamespace=true
    project: default
    source:
      repoURL: https://apache.github.io/superset
      targetRevision: 0.15.5
      helm:
        releaseName: superset
        values: |
          envFromSecret: superset-external-env
          secretEnv:
            create: false
          bootstrapScript: |
            #!/bin/bash
            uv pip install psycopg2-binary
            if [ ! -f ~/bootstrap ]; then echo "Running Superset with uid {{ .Values.runAsUser }}" > ~/bootstrap; fi
          postgresql:
            enabled: false
          redis:
            enabled: false
          supersetNode:
            connections:
              db_type: postgresql
              db_host: postgresql.database.svc.cluster.local
              db_port: "5432"
              db_user: n8n
              db_name: superset
              redis_host: redis-master.database.svc.cluster.local
              redis_port: "6379"
              redis_user: ""
              redis_cache_db: "1"
              redis_celery_db: "0"
          configOverrides:
            secret: |
              import os
              SECRET_KEY = os.getenv("SUPERSET_SECRET_KEY")
            proxy: |
              ENABLE_PROXY_FIX = True
          init:
            createAdmin: false
            initscript: |-
              #!/bin/sh
              set -eu
              echo "Upgrading DB schema..."
              superset db upgrade
              echo "Initializing roles..."
              superset init
              echo "Creating admin user..."
              superset fab create-admin \
                --username admin \
                --firstname Superset \
                --lastname Admin \
                --email admin@dev.72602.online \
                --password "${SUPERSET_ADMIN_PASSWORD}" \
                || true
          ingress:
            enabled: true
            ingressClassName: nginx
            annotations:
              cert-manager.io/cluster-issuer: lets-encrypt
            hosts:
              - superset.dev.72602.online
            path: /
            pathType: Prefix
            tls:
              - secretName: superset.dev.72602.online-tls
                hosts:
                  - superset.dev.72602.online
      chart: superset
    destination:
      server: https://kubernetes.default.svc
      namespace: database
    syncPolicy:
      automated:
        prune: true
        selfHeal: true
      syncOptions:
        - CreateNamespace=true

  EOF
  ```
  {{% /notice %}}
{{< /tab >}}

{{< tab title="72602" style="transparent" >}}

  {{% notice style="transparent" %}}
  ```yaml
  kubectl -n argocd apply -f -<< EOF
  
  EOF
  ```
  {{% /notice %}}

{{< /tab >}}
{{< /tabs >}}

  <p> <b>3.sync by argocd</b></p>

  {{% notice style="transparent" %}}
  ```bash
  argocd app sync argocd/superset
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


{{< tab title="♻️Argo Workflow" style="transparent" >}}
  {{% include "content\Installation\SNIPPET\_argo_wf_preliminary.md" %}}

  <p> <b>1.prepare `argocd-login-credentials` </b></p>

  {{% notice style="transparent" %}}
  ```bash
  kubectl get namespaces database > /dev/null 2>&1 || kubectl create namespace database
  ```
  {{% /notice %}}


  <p> <b>2.apply rolebinding to k8s </b></p>

  {{% notice style="transparent" %}}
  {{% include "content\Installation\SNIPPET\_argo_wf_rbac.md" %}}
  {{% /notice %}}

  <p> <b>4.prepare `deploy-xxxx-flow.yaml` </b></p>

  {{% notice style="transparent" %}}
  ```yaml

  ```
  {{% /notice %}}


  <p> <b>5.submit to argo workflow client</b></p> 

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
