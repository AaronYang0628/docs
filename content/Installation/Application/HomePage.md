+++
title = 'HomePage'
date = 2024-05-07T15:00:59+08:00
weight = 14
+++

### Web Page
[homepage web page (https://home.72602.online)](https://home.72602.online)

### 🚀Installation

{{< tabs groupid="xxxx" style="primary" title="Install By" icon="thumbtack" >}}

{{< tab title="🐙ArgoCD" style="transparent" >}}
  {{% include "/Installation/SNIPPET/_argo_cd_preliminary.md" %}}

  <p> <b>1.prepare</b> `homepage-argocd.yaml` </p>

  ```shell
  kubectl -n argocd apply -f https://raw.githubusercontent.com/AaronYang0628/docs/main/argocd.app-homepage.yaml
  ```

  <p> <b>2.sync by argocd</b> </p>

  ```shell
  argocd app sync homepage
  ```

  <p> <b>3.verify</b> </p>

  ```shell
  kubectl -n application get pods -l app.kubernetes.io/name=homepage
  ```

{{< /tab >}}

{{< tab title="📦Helm" style="transparent" >}}
  <p> <b>1.prepare</b> `helm-values.yaml` </p>

  ```shell
  helm repo add gethomepage https://gethomepage.dev/helm/
  helm repo update
  ```

  <p> <b>2.install</b> </p>

  ```shell
  helm upgrade --install homepage gethomepage/homepage \
    -n application \
    -f manifests/homepage/homepage.values.yaml
  ```

{{< /tab >}}

{{< tab title="🛠️Manifests" style="transparent" >}}
  Manifests are available at `manifests/homepage/` in this repository.

  Generate ConfigMap from config files:

  ```shell
  bash scripts/gen-homepage-configmap.sh
  ```

  Apply manifests:

  ```shell
  kubectl apply -k manifests/homepage/
  ```

{{< /tab >}}

{{< /tabs >}}

### Configuration

Homepage configuration files are at `manifests/homepage/config/`:

- `bookmarks.yaml` - browser bookmarks
- `services.yaml` - service widgets
- `kubernetes.yaml` - Kubernetes cluster info
- `docker.yaml` - Docker containers
- `settings.yaml` - layout settings
- `widgets.yaml` - dashboard widgets
- `custom.css` / `custom.js` - custom styling

Update these files and regenerate the ConfigMap:

```shell
bash scripts/gen-homepage-configmap.sh
```

Then sync via ArgoCD or re-apply:

```shell
kubectl -n application apply -f manifests/homepage/configmap.yaml
```
