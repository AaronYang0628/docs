+++
tags = ["Kafka"]
title = 'Prepare Dev Environment'
date = 2024-03-07T15:00:59+08:00
weight = 1
+++


1. update go -> 1.24
{{% include file="Content\Installation\Binary\golang.md" %}}

2. install `ko` -> 1.8.0
```shell
go install github.com/google/ko@latest
# wget https://github.com/ko-build/ko/releases/download/v0.18.0/ko_0.18.0_Linux_x86_64.tar.gz
# tar -xzf ko_0.18.0_Linux_x86_64.tar.gz  -C /usr/local/bin/ko
# cp /usr/local/bin/ko/ko /root/bin
```

3. protoc
```shell
PB_REL="https://github.com/protocolbuffers/protobuf/releases"
curl -LO $PB_REL/download/v30.2/protoc-30.2-linux-x86_64.zip
# mkdir -p ${HOME}/bin/
mkdir -p /usr/local/bin/protoc
unzip protoc-30.2-linux-x86_64.zip -d /usr/local/bin/protoc
cp /usr/local/bin/protoc/bin/protoc /root/bin
# export PATH="$PATH:/root/bin"
rm -rf protoc-30.2-linux-x86_64.zip
```
4. protoc-gen-go -> 1.5.4
```shell
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
```

```shell
export GOPATH=/usr/local/go/bin
```

5. copy some code
```shell
mkdir -p ${GOPATH}/src/knative.dev
cd ${GOPATH}/src/knative.dev
git clone git@github.com:knative/eventing.git # clone eventing repo
git clone git@github.com:AaronYang0628/eventing-kafka-broker.git
cd eventing-kafka-broker
git remote add upstream https://github.com/knative-extensions/eventing-kafka-broker.git
git remote set-url --push upstream no_push
```


```shell
export KO_DOCKER_REPO=docker-registry.lab.zverse.space/data-and-computing/ay-dev
```