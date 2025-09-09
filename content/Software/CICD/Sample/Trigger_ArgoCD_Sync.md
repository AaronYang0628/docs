+++
title = 'Publish 2 Harbor'
date = 2025-03-07T15:00:59+08:00
weight = 10
+++


```yaml
name: publish-image-to-ghcr
run-name: ${{ gitea.actor }} is testing out Gitea Push Image 🚀
on: [push]

env:
  REGISTRY: harbor.zhejianglab.com
  USER: byang628@zhejianglab.com
  REPOSITORY_NAMESPACE: ay-dev
jobs:
  build-and-push-images:
    strategy:
      matrix:
        include:
          - name_suffix: "aria-ng"
            container_path: "application/aria2/container/aria-ng"
            dockerfile_path: "application/aria2/container/aria-ng/Dockerfile"
          - name_suffix: "aria2"
            container_path: "application/aria2/container/aria2"
            dockerfile_path: "application/aria2/container/aria2/Dockerfile"
    runs-on: ubuntu-latest:host
    steps:
    - name: checkout-repository
      uses: actions/checkout@v4
    - name: log in to the container registry
      uses: docker/login-action@v3
      with:
        registry: "${{ env.REGISTRY }}"
        username: "${{ env.USER }}"
        password: "${{ secrets.HARBOR_REGISTRY_PWD }}"
    - name: build and push container image
      uses: docker/build-push-action@v6
      with:
        context: "${{ matrix.container_path }}"
        file: "${{ matrix.dockerfile_path }}"
        push: true
        tags: |
          ${{ env.REGISTRY }}/${{ env.REPOSITORY_NAMESPACE }}/${{ github.repository }}-${{ matrix.name_suffix }}:${{ inputs.tag || 'latest' }}
          ${{ env.REGISTRY }}/${{ env.REPOSITORY_NAMESPACE }}/${{ github.repository }}-${{ matrix.name_suffix }}:${{ github.ref_name }}
        labels: |
          org.opencontainers.image.source=${{ github.server_url }}/${{ github.repository }}
```
