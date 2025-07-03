+++
title = 'Java 21 + Go 1.24'
date = 2024-03-07T15:00:59+08:00
weight = 100
+++

### prepare `.devcontainer.json`
```json
{
  "name": "Go & Java DevContainer",
  "build": {
    "dockerfile": "Dockerfile"
  },
  "mounts": [
    "source=/root/.kube/config,target=/root/.kube/config,type=bind",
    "source=/root/.minikube/profiles/minikube/client.crt,target=/root/.minikube/profiles/minikube/client.crt,type=bind",
    "source=/root/.minikube/profiles/minikube/client.key,target=/root/.minikube/profiles/minikube/client.key,type=bind",
    "source=/root/.minikube/ca.crt,target=/root/.minikube/ca.crt,type=bind"
  ],
  "customizations": {
    "vscode": {
      "extensions": [
        "golang.go",
        "vscjava.vscode-java-pack",
        "redhat.java",
        "vscjava.vscode-maven",
        "Alibaba-Cloud.tongyi-lingma",
        "vscjava.vscode-java-debug",
        "vscjava.vscode-java-dependency",
        "vscjava.vscode-java-test"
      ]
    }
  },
  "remoteUser": "root",
  "postCreateCommand": "go version && java -version && mvn -v"
}

```


### prepare `Dockerfile`
```dockerfile
FROM m.daocloud.io/docker.io/ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    wget \
    gnupg \
    vim \
    lsb-release \
    apt-transport-https \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# install OpenJDK 21 
RUN mkdir -p /etc/apt/keyrings && \
    wget -qO - https://packages.adoptium.net/artifactory/api/gpg/key/public | gpg --dearmor -o /etc/apt/keyrings/adoptium.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/adoptium.gpg arch=amd64] https://packages.adoptium.net/artifactory/deb $(awk -F= '/^VERSION_CODENAME/{print$2}' /etc/os-release) main" | tee /etc/apt/sources.list.d/adoptium.list > /dev/null && \
    apt-get update && \
    apt-get install -y temurin-21-jdk && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# set java env
ENV JAVA_HOME=/usr/lib/jvm/temurin-21-jdk-amd64

# install maven
ARG MAVEN_VERSION=3.9.10
RUN wget https://dlcdn.apache.org/maven/maven-3/${MAVEN_VERSION}/binaries/apache-maven-${MAVEN_VERSION}-bin.tar.gz -O /tmp/maven.tar.gz && \
    mkdir -p /opt/maven && \
    tar -C /opt/maven -xzf /tmp/maven.tar.gz --strip-components=1 && \
    rm /tmp/maven.tar.gz

ENV MAVEN_HOME=/opt/maven
ENV PATH="${MAVEN_HOME}/bin:${PATH}"

# install go 1.24.4 
ARG GO_VERSION=1.24.4
RUN wget https://dl.google.com/go/go${GO_VERSION}.linux-amd64.tar.gz -O /tmp/go.tar.gz && \
    tar -C /usr/local -xzf /tmp/go.tar.gz && \
    rm /tmp/go.tar.gz

# set go env
ENV GOROOT=/usr/local/go
ENV GOPATH=/go
ENV PATH="${GOROOT}/bin:${GOPATH}/bin:${PATH}"

# install other binarys
ARG KUBECTL_VERSION=v1.33.0
RUN wget https://files.m.daocloud.io/dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl -O /tmp/kubectl && \
    chmod u+x /tmp/kubectl && \
    mv -f /tmp/kubectl /usr/local/bin/kubectl 

ARG HELM_VERSION=v3.13.3
RUN wget https://files.m.daocloud.io/get.helm.sh/helm-${HELM_VERSION}-linux-amd64.tar.gz -O /tmp/helm-${HELM_VERSION}-linux-amd64.tar.gz && \
    mkdir -p /opt/helm && \
    tar -C /opt/helm -xzf /tmp/helm-${HELM_VERSION}-linux-amd64.tar.gz && \
    rm /tmp/helm-${HELM_VERSION}-linux-amd64.tar.gz

ENV HELM_HOME=/opt/helm/linux-amd64
ENV PATH="${HELM_HOME}:${PATH}"

USER root
WORKDIR /workspace
```
