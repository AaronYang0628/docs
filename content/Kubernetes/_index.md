+++
title = '☸️Kubernetes'
date = 2024-03-07T15:00:59+08:00
weight = 5
+++

{{%children depth="999" description="false" showhidden="true" %}}


### Basic
- Master Node （Control-Panel）
    - core-dns: k8s集群中的DNS服务
    - kube-apiserver: 管理员操作整个k8s集群的入口， 能对对各种资源进行CRUD
    - etcd: kubectl-apiserver的后台数据存储
    - kube-scheduler: 集群的调度器， 分配Pod到合适的Node上
    - kube-controller-manager: 控制管理器，保证k8s集群中的资源按照要求运行，例如，管理Replica, Namespace, SA, 资源定额ResourceQuota等
    - kube-flannel-ds: 一款名为flannel的网络插件，可以创建虚拟网络，保证节点间的沟通
    - metrics-server: 检测k8s集群中CPU与内存的使用情况，同时为集群自动扩缩容技术HPA打下基础
- Work Node
    - kubelet: 负责与master节点交互，进而执行具体的任务
    - kube-proxy: 负责k8s集群中的负载均衡
    - csi-plugin: 存储插件，负责k8s集群内容器的存储挂载
    - csi-provisioner: 负责k8s集群中存储分配


### Info
- `Service` v.s. `Endpoint`

