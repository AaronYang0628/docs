+++
title = 'Helm Chart CheatSheet'
date = 2024-03-07T15:00:59+08:00
weight = 2
+++

### Finding Charts
```shell
helm search hub wordpress
```

### Adding Repositories
```shell
helm repo add ay-helm-mirror https://aaronyang0628.github.io/helm-chart-mirror/charts
helm repo update
```

### Showing Chart Values
```shell
helm show values bitnami/wordpress
```

### Packaging Charts
```shell
helm package --dependency-update --destination /tmp/ /root/metadata-operator/environments/helm/metadata-environment/charts
```

### Uninstall Chart
```shell
helm uninstall -n warehouse warehouse
```
when failed, you can try
```shell
helm uninstall -n warehouse warehouse --no-hooks --cascade=foreground
```