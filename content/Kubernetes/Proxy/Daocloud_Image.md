+++
title = 'Daocloud Image'
date = 2024-03-07T15:00:59+08:00
+++


## 快速开始

```
docker run -d -P m.daocloud.io/docker.io/library/nginx
```
## 使用方法

**增加前缀** (推荐方式)。比如：

``` log
              docker.io/library/busybox
                 |
                 V
m.daocloud.io/docker.io/library/busybox
```

或者 支持的镜像仓库 的 *前缀替换* 就可以使用。比如：

``` log
           docker.io/library/busybox
             |
             V
docker.m.daocloud.io/library/busybox
```

## 无缓存

在拉取的时候如果Daocloud没有缓存, 将会在 [同步队列](https://queue.m.daocloud.io/status/) 添加同步缓存的任务.

## 支持前缀替换的 Registry (不推荐)

推荐使用添加前缀的方式.

前缀替换的 Registry 的规则, 这是人工配置的, 有需求提 Issue.

| 源站               | 替换为                | 备注                                            |
| ------------------ | --------------------- | ---------------------------------------------- |
| docker.elastic.co  | elastic.m.daocloud.io |                                                |
| docker.io          | docker.m.daocloud.io  |                                                |
| gcr.io             | gcr.m.daocloud.io     |                                                |
| ghcr.io            | ghcr.m.daocloud.io    |                                                |
| k8s.gcr.io         | k8s-gcr.m.daocloud.io | k8s.gcr.io 已被迁移到 registry.k8s.io           |
| registry.k8s.io    | k8s.m.daocloud.io     |                                                |
| mcr.microsoft.com  | mcr.m.daocloud.io     |                                                |
| nvcr.io            | nvcr.m.daocloud.io    |                                                |
| quay.io            | quay.m.daocloud.io    |                                                |
| registry.ollama.ai | ollama.m.daocloud.io  |                                                |

## 最佳实践

### 加速 Kubneretes

#### 加速安装 kubeadm
``` bash
kubeadm config images pull --image-repository k8s-gcr.m.daocloud.io
```

#### 加速安装 kind

``` bash
kind create cluster --name kind --image m.daocloud.io/docker.io/kindest/node:v1.22.1
``` 

#### 加速 Containerd

* 参考 Containerd 官方文档: [hosts.md](https://github.com/containerd/containerd/blob/main/docs/hosts.md#registry-host-namespace)
* 如果您使用 kubespray 安装 containerd, 可以配置 [`containerd_registries_mirrors`](https://github.com/kubernetes-sigs/kubespray/blob/master/docs/CRI/containerd.md#containerd-config)

### 加速 Docker

添加到 `/etc/docker/daemon.json`
``` json
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io"
  ]
}
```

### 加速 Ollama & DeepSeek

#### 加速安装 Ollama

CPU:
```bash
docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama docker.m.daocloud.io/ollama/ollama
```

GPU 版本:
1. 首先安装 Nvidia Container Toolkit
2. 运行以下命令启动 Ollama 容器：

```bash
docker run -d --gpus=all -v ollama:/root/.ollama -p 11434:11434 --name ollama docker.m.daocloud.io/ollama/ollama
```

更多信息请参考：
* [Ollama Docker 官方文档](https://ollama.com/blog/ollama-is-now-available-as-an-official-docker-image)

#### 加速使用 Deepseek-R1 模型

如上述步骤，在启动了ollama容器的前提下，还可以通过加速源，加速启动DeepSeek相关的模型服务

注：目前 Ollama 官方源的下载速度已经很快，您也可以直接使用[官方源](https://ollama.com/library/deepseek-r1:1.5b)。

```bash
# 使用加速源
docker exec -it ollama ollama run ollama.m.daocloud.io/library/deepseek-r1:1.5b

# 或直接使用官方源下载模型
# docker exec -it ollama ollama run deepseek-r1:1.5b
```