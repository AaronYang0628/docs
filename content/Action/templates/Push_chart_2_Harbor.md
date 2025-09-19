+++
title = 'Publish Chart 2 Harbor'
date = 2025-03-07T15:00:59+08:00
weight = 10
+++


```yaml
name: publish-chart-to-harbor-registry
run-name: ${{ gitea.actor }} is testing out Gitea Push Chart 🚀
on: [push]

env:
  REGISTRY: harbor.zhejianglab.com
  USER: byang628@zhejianglab.com
  REPOSITORY_NAMESPACE: ay-dev
  CHART_NAME: data-warehouse
jobs:
  build-and-push-charts:
    runs-on: ubuntu-latest
    permissions:
      packages: write
      contents: read
    strategy:
      matrix:
        include:
          - chart_path: "environments/helm/metadata-environment"
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Log in to Harbor
        uses: docker/login-action@f4ef78c080cd8ba55a85445d5b36e214a81df20a
        with:
          registry: "${{ env.REGISTRY }}"
          username: "${{ env.USER }}"
          password: "${{ secrets.ZJ_HARBOR_TOKEN }}"

      - name: Helm Publish Action
        uses: AaronYang0628/push-helm-chart-to-oci@v0.0.3
        with:
          working-dir: ${{ matrix.chart_path }}
          oci-repository: oci://${{ env.REGISTRY }}/${{ env.REPOSITORY_NAMESPACE }}
          username: ${{ env.USER }}
          password: ${{ secrets.ZJ_HARBOR_TOKEN }}
```
