+++
title = 'Kind'
date = 2024-03-07T15:00:59+08:00
weight = 111
+++

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



### Customize your cluster

Creating a Kubernetes cluster is as simple as `kind create cluster`
```shell
kind create cluster --name test
```

### Reference
and the you can visit [https://kind.sigs.k8s.io/docs/user/quick-start/](https://kind.sigs.k8s.io/docs/user/quick-start/) for mode detail.
