+++
title = 'Helm Chart CheatSheet'
date = 2024-03-07T15:00:59+08:00
weight = 2
+++

### 'helm search': Finding Charts
```shell
helm search hub wordpress
```

### 'helm repo add': Adding Repositories
```shell
helm repo add ay-helm-mirror https://aaronyang0628.github.io/helm-chart-mirror/charts
helm repo update
```

### 'helm show values': Listing Repositories
```shell
helm show values bitnami/wordpress
```

### 'helm package': Packaging Charts
```shell
helm package --dependency-update --destination /tmp/ /root/metadata-operator/environments/helm/metadata-environment/charts
```
