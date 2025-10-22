+++
title = 'Deploy A Nginx App'
date = 2025-10-22T15:00:59+08:00
+++



{{< tabs groupid="main" style="primary" title="Sync" icon="thumbtack" >}}
{{< tab title="Manifest Files" >}}
  When your k8s resource files located in <b>`mainfests`</b> folder, you can use the following command to deploy your app. <br/>
  you only need to set <b>`spec.source.path: mainfests`</b> 
  {{< tabs groupid="tabs-example-language" >}}
  {{% tab title="file tree" %}}
```tree
- sample-repo | folder
  - content | folder
  - src | folder
  - mainfests | folder | magic
    - deploy.yaml | fa-regular fa-file-code | #888cc4
    - svc.yaml | fa-regular fa-file-code | #888cc4
    - ...
```
  {{% /tab %}}
  {{% tab title="app.yaml" %}}
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: hugo-blog
spec:
  project: default
  source:
    repoURL: 'git@github.com:AaronYang0628/home-site.git'
    targetRevision: main
    path: mainfests
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - ApplyOutOfSyncOnly=true
  destination:
    server: https://kubernetes.default.svc
    namespace: application
```
  {{% /tab %}}
  {{< /tabs >}}
{{< /tab >}}

{{< tab title="Whole Repo" style="default" color="darkorchid" >}}
  Not only you need files in <b>`mainfests`</b> folder, but also need files in root folder. <br/><br/>
  you have to create an extra file `kustomization.yaml`, and set <b>`spec.source.path: .`</b> 

  {{< tabs groupid="tabs-example-language" >}}
  {{% tab title="file tree" %}}
```tree
- sample-repo | folder
  - kustomization.yaml | fa-regular fa-file-code | #888cc4
  - content | folder
  - src | folder
  - mainfests | folder | magic
    - deploy.yaml | fa-regular fa-file-code | #888cc4
    - svc.yaml | fa-regular fa-file-code | #888cc4
    - ...
```
  {{% /tab %}}
  {{% tab title="app.yaml" %}}
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: hugo-blog
spec:
  project: default
  source:
    repoURL: 'git@github.com:AaronYang0628/home-site.git'
    targetRevision: main
    path: .
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - ApplyOutOfSyncOnly=true
  destination:
    server: https://kubernetes.default.svc
    namespace: application
```
  {{% /tab %}}
  {{% tab title="kustomization.yaml" %}}
```yaml
resources:
  - manifests/pvc.yaml
  - manifests/job.yaml
  - manifests/deployment.yaml
  - ...
```
  {{% /tab %}}
  {{< /tabs >}}
{{< /tab >}}


{{< /tabs >}}
