+++
title = 'Creating A Pod'
date = 2024-03-07T15:00:59+08:00
weight = 30
+++

描述 Kubernetes 中一个 Pod 的创建过程，可以清晰地展示了 K8s 各个核心组件是如何协同工作的。

我们可以将整个过程分为两个主要阶段：**控制平面的决策阶段** 和 **工作节点的执行阶段**。

---

### 第一阶段：控制平面决策（大脑决策）

1.  **用户提交请求**
    *   用户使用 `kubectl apply -f pod.yaml` 向 **kube-apiserver** 提交一个 Pod 定义文件。
    *   `kubectl` 会验证配置并将其转换为 JSON 格式，通过 REST API 调用发送给 kube-apiserver。

2.  **API Server 处理与验证**
    *   **kube-apiserver** 接收到请求后，会进行一系列操作：
        *   **身份认证**：验证用户身份。
        *   **授权**：检查用户是否有权限创建 Pod。
        *   **准入控制**：可能调用一些准入控制器来修改或验证 Pod 对象（例如，注入 Sidecar 容器、设置默认资源限制等）。
    *   所有验证通过后，**kube-apiserver** 将 Pod 的元数据对象写入 **etcd** 数据库。此时，Pod 在 etcd 中的状态被标记为 `Pending`。
    *   **至此，Pod 的创建请求已被记录，但还未被调度到任何节点。**

3.  **调度器决策**
    *   **kube-scheduler** 作为一个控制器，通过 **watch** 机制持续监听 kube-apiserver，发现有一个新的 Pod 被创建且其 `nodeName` 为空。
    *   调度器开始为这个 Pod 选择一个最合适的节点，它执行两阶段操作：
        *   **过滤**：根据节点资源（CPU、内存）、污点、节点选择器、存储、镜像拉取等因素过滤掉不合适的节点。
        *   **评分**：对剩下的节点进行打分（例如，考虑资源均衡、亲和性等），选择得分最高的节点。
    *   做出决策后，**kube-scheduler** **补丁** 的方式更新 kube-apiserver 中该 Pod 的定义，将其 `nodeName` 字段设置为选定的节点名称。
    *   **kube-apiserver** 再次将这个更新后的信息写入 **etcd**。

---

### 第二阶段：工作节点执行（肢体行动）

4.  **kubelet 监听到任务**
    *   目标节点上的 **kubelet** 同样通过 **watch** 机制监听 kube-apiserver，发现有一个 Pod 被“分配”到了自己所在的节点（即其 `nodeName` 与自己的节点名匹配）。
    *   kubelet 会从 kube-apiserver 读取完整的 Pod 定义。

5.  **kubelet 控制容器运行时**
    *   **kubelet** 通过 **CRI** 接口调用本地的**容器运行时**（如 containerd、CRI-O）。
    *   容器运行时负责：
        *   从指定的镜像仓库**拉取**容器镜像（如果本地不存在）。
        *   根据 Pod 定义**创建**和**启动**容器。

6.  **配置容器环境**
    *   在启动容器前后，**kubelet** 还会通过其他接口完成一系列配置：
        *   **CNI**：调用网络插件（如 Calico、Flannel）为 Pod 分配 IP 地址并配置网络。
        *   **CSI**：如果 Pod 使用了持久化存储，会调用存储插件挂载存储卷。

7.  **状态上报**
    *   当 Pod 中的所有容器都成功启动并运行后，**kubelet** 会持续监控容器的健康状态。
    *   它将 Pod 的当前状态（如 `Running`）和 IP 地址等信息作为状态更新，**上报**给 **kube-apiserver**。
    *   **kube-apiserver** 最终将这些状态信息写入 **etcd**。

---

### 总结流程图

用户 `kubectl` -> **API Server** -> **(写入) etcd** -> **Scheduler** (绑定节点) -> **API Server** -> **(更新) etcd** -> **目标节点 kubelet** -> **容器运行时** (拉镜像，启容器) -> **CNI/CSI** (配网络/存储) -> **kubelet** -> **API Server** -> **(更新状态) etcd**

**核心要点：**
*   **声明式 API**：用户声明“期望状态”，系统驱动“当前状态”向其靠拢。
*   **监听与协同**：所有组件都通过监听 kube-apiserver 来获取任务并协同工作。
*   **etcd 作为唯一信源**：整个集群的状态始终以 etcd 中的数据为准。
*   **组件职责分离**：Scheduler 只管调度，kubelet 只管执行，API Server 只管交互和存储。