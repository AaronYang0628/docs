+++
title = 'Publish Image 2 Harbor'
date = 2025-03-07T15:00:59+08:00
weight = 10
+++


```yaml
name: publish-image-to-harbor-registry
run-name: ${{ gitea.actor }} is testing out Gitea Push Image 🚀
on: [push]


env:
  REGISTRY: harbor.zhejianglab.com
  USER: byang628@zhejianglab.com
  REPOSITORY_NAMESPACE: ay-dev
  IMAGE_NAME: metadata-crd-operator
jobs:
  build-and-push-images:
    runs-on: ubuntu-latest
    permissions:
      packages: write
      contents: read
    strategy:
      matrix:
        include:
          - name_suffix: "dev"
            container_path: "."
            dockerfile_path: "./Dockerfile"
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Log in to Harbor
        uses: docker/login-action@f4ef78c080cd8ba55a85445d5b36e214a81df20a
        with:
          registry: "${{ env.REGISTRY }}"
          username: "${{ env.USER }}"
          password: "${{ secrets.ZJ_HARBOR_TOKEN }}"

      - name: Extract Current Date
        id: extract-date
        run: |
          echo "current-date=$(date +'%Y%m%d')" >> $GITHUB_OUTPUT
          echo will push image: ${{ env.REGISTRY }}/${{ env.REPOSITORY_NAMESPACE }}/${{ env.IMAGE_NAME }}-${{ matrix.name_suffix }}:v${{ steps.extract-date.outputs.current-date }}

      - name: Build And Push Container Image
        uses: docker/build-push-action@v6
        with:
          context: "${{ matrix.container_path }}"
          file: "${{ matrix.dockerfile_path }}"
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.REPOSITORY_NAMESPACE }}/${{ env.IMAGE_NAME }}-${{ matrix.name_suffix }}:v${{ steps.extract-date.outputs.current-date }}
          labels: |
            org.opencontainers.image.source=${{ github.server_url }}/${{ github.repository }}
```
