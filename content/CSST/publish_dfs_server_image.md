+++
title = 'Publish DFS Server Image'
date = 2024-03-20T19:58:45+08:00
weight = 1
+++

### 1. create `git-credential`
```shell
GIT_USERNAME=boyang628
GIT_PASSWORD=yW9Yx__usgWy11aouzBB
kubectl -n business-workflows create secret generic git-credentials \
  --from-literal="username=${GIT_USERNAME}" \
  --from-literal="password=${GIT_PASSWORD}"
```
{{%expand title="how to get password"%}}
1. go to [https://inner-gitlab.citybrain.org/-/profile/personal_access_tokens](https://inner-gitlab.citybrain.org/-/profile/personal_access_tokens)
2. create a token with `read_repository` authority
3. copy it!

![how to apply a token](../asset/git-token.png)

{{%/expand%}}

### 2. [[Optional]]() create `docker-login-credential` [FIXED]
```shell
DOCKER_LOGIN_USERNAME=ascm-org-1705656754517
DOCKER_LOGIN_PASSWORD=4HRXwB5IoAQWUlhc
kubectl -n business-workflows create secret generic docker-login-credentials \
  --from-literal="username=${DOCKER_LOGIN_USERNAME:-wangz2019}" \
  --from-literal="password=${DOCKER_LOGIN_PASSWORD}"
```

### 3. prepare `publish-dfs-image.yaml`
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: publish-dfs-image-
spec:
  entrypoint: entry
  serviceAccountName: argo-workflow
  volumeClaimTemplates:
  - metadata:
      name: workspace
    spec:
      accessModes:
      - ReadWriteOnce
      storageClassName: nfs-external-nas
      resources:
        requests:
          storage: 1Gi
  templates:
  - name: entry
    dag:
      tasks:
      - name: dind
        template: dind
      - name: wait-for-dind
        dependencies:
        - dind
        template: wait-for-dind
        arguments:
          parameters:
          - name: dockerd-host
            value: "{{tasks.dind.ip}}"
      - name: publish
        dependencies:
        - wait-for-dind
        template: publish
        arguments:
          parameters:
          - name: dockerd-host
            value: "{{tasks.dind.ip}}"
  - name: dind
    daemon: true
    container:
      image: m.daocloud.io/docker.io/library/docker:25.0.3-dind-alpine3.19
      env:
      - name: DOCKER_TLS_CERTDIR
        value: ""
      command:
      - dockerd-entrypoint.sh
      - --insecure-registry
      - cr.registry.res.cloud.wuxi-yqgcy.cn
      securityContext:
        privileged: true
      volumeMounts:
      - name: workspace
        mountPath: /workspace
  - name: wait-for-dind
    inputs:
      parameters:
      - name: dockerd-host
    container:
      image: m.daocloud.io/docker.io/library/docker:25.0.3-cli-alpine3.19
      env:
      - name: DOCKER_HOST
        value: "{{inputs.parameters.dockerd-host}}"
      command:
      - sh
      - -c
      args:
      - |
        until docker ps; do sleep 3; done;
  - name: publish
    inputs:
      artifacts:
      - name: source
        path: /workspace/src
        git:
          repo: https://inner-gitlab.citybrain.org/csst/csst-py.git
          revision: main
          usernameSecret:
            name: git-credentials
            key: username
          passwordSecret:
            name: git-credentials
            key: password
      parameters:
      - name: dockerd-host
      - name: registry-to-push
        value: cr.registry.res.cloud.wuxi-yqgcy.cn
      - name: image-to-publish
        value: csst/dfs:v1-argo-ay-test
      - name: registry
        value: m.daocloud.io/docker.io
    container:
      image: m.daocloud.io/docker.io/library/docker:25.0.3-cli-alpine3.19
      env:
      - name: DOCKER_HOST
        value: "{{inputs.parameters.dockerd-host}}"
      - name: DOCKER_USERNAME
        valueFrom:
          secretKeyRef:
            name: docker-login-credentials
            key: username
      - name: DOCKER_PASSWORD
        valueFrom:
          secretKeyRef:
            name: docker-login-credentials
            key: password
      command:
      - sh
      - -c
      args:
      - |
        set -e
        export REGISTRY={{inputs.parameters.registry}}
        export REGISTRY_TO_PUSH={{inputs.parameters.registry-to-push}}
        export IMAGE_TO_PUBLISH=${REGISTRY_TO_PUSH}/{{inputs.parameters.image-to-publish}}
        docker build \
            --ulimit nofile=4096:4096 \
            -f /workspace/src/Dockerfile \
            --build-arg REGISTRY=${REGISTRY} \
            -t ${IMAGE_TO_PUBLISH} /workspace/src \
            && docker login -u="${DOCKER_USERNAME}" -p="${DOCKER_PASSWORD}" ${REGISTRY_TO_PUSH} \
            && docker push ${IMAGE_TO_PUBLISH}
      volumeMounts:
      - name: workspace
        mountPath: /workspace
```


### 4. submit to argo workflow
```shell
argo -n business-workflows submit publish-dfs-image.yaml
```