+++
title = 'Kind'
date = 2024-03-07T15:00:59+08:00
description = "k8s in th docker"
weight = 111
+++

<img src="../../../images/content/kubernetes/kind.png" alt="kind-logo" width="300">

> [!WARNING]
> Although this is a easiest way to build a cluster, but I wont recommend you to choose this. SInce there are many unsolved issue in here, check [https://kind.sigs.k8s.io/docs/user/known-issues/](https://kind.sigs.k8s.io/docs/user/known-issues/)


### Preliminary
- Kind binary has installed, if not check 🔗[link](Installation/binary/kind/index.html)
- Hardware Requirements:
    1. At least **2 GB** of RAM per machine (minimum **1 GB**)
    2. **2 CPUs** on the master node
    3. Full network connectivity among all machines (public or private network)

- Operating System:
    1. Ubuntu 22.04/14.04, CentOS 7/8, or any other supported Linux distribution.

- Network Requirements:
    1. Unique hostname, MAC address, and product_uuid for each node.
    2. Certain ports need to be open (e.g., 6443, 2379-2380, 10250, 10251, 10252, 10255, etc.)



### Create your cluster

Creating a Kubernetes cluster is as simple as `kind create cluster`
```shell
kind create cluster --name test
```

{{% expand title="Customize your cluster" expanded="true" %}}
If you need to configure your cluster, you can create `kind-config.yaml`
```bash
# 创建配置文件
cat <<EOF > kind-config.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
- role: worker
- role: worker
EOF

# 创建集群
kind create cluster --name my-cluster --config kind-config.yaml

# 等待容器启动
sleep 10

# 设置资源限制
docker update --memory="4g" --cpus="2" my-cluster-control-plane
docker update --memory="2g" --cpus="1" my-cluster-worker
docker update --memory="2g" --cpus="1" my-cluster-worker2

echo "✅集群创建完成，资源限制已应用"
```


{{% /expand %}}

### Delete your cluster

```shell
kind delete cluster
```

### Reference
and the you can visit [https://kind.sigs.k8s.io/docs/user/quick-start/](https://kind.sigs.k8s.io/docs/user/quick-start/) for mode detail.
