+++
title = 'Deleting A Pod'
date = 2024-03-07T15:00:59+08:00
weight = 40
+++

删除一个 Pod 的流程与创建过程相对应，但它更侧重于如何**优雅地、安全地终止一个运行中的实例**。这个过程同样涉及多个组件的协同。

下面是一个 Pod 的删除流程，但它的核心是体现 Kubernetes 的**优雅终止**机制。

---

### 删除流程的核心阶段

#### 阶段一：用户发起删除指令

1.  **用户执行命令**：用户执行 `kubectl delete pod <pod-name>`。
2.  **API Server 接收请求**：
    *   `kubectl` 向 **kube-apiserver** 发送一个 `DELETE` 请求。
    *   kube-apiserver 会进行认证、授权等验证。
3.  **“标记为删除”**：验证通过后，kube-apiserver **不会立即从 etcd 中删除该 Pod 对象**，而是会执行一个关键操作：**为 Pod 对象设置一个“删除时间戳”（`deletionTimestamp`）并将其标记为 `Terminating` 状态**。这个状态会更新到 **etcd** 中。

#### 阶段二：控制平面与节点的通知

4.  **组件感知变化**：
    *   所有监听 kube-apiserver 的组件（如 **kube-scheduler**, 各个节点的 **kubelet**）都会立刻感知到这个 Pod 的状态已变为 `Terminating`。
    *   **Endpoint Controller** 会立刻将这个 Pod 的 IP 从关联的 **Service** 的 Endpoints（或 EndpointSlice）列表中移除。这意味着**新的流量不会再被负载均衡到这个 Pod 上**。

#### 阶段三：节点上的优雅终止

这是最关键的阶段，发生在 Pod 所在的工作节点上。

5.  **kubelet 监听到状态变化**：目标节点上的 **kubelet** 通过 watch 机制发现它管理的某个 Pod 被标记为 `Terminating`。
6.  **触发优雅关闭序列**：
    *   **第1步：执行 PreStop Hook**（如果配置了的话）
        kubelet 会首先执行 Pod 中容器定义的 `preStop` 钩子。这是一个**在发送终止信号之前**执行的特定命令或 HTTP 请求。常见用途包括：
        *   通知上游负载均衡器此实例正在下线。
        *   让应用完成当前正在处理的请求。
        *   执行一些清理任务。
    *   **第2步：发送 SIGTERM 信号**
        kubelet 通过容器运行时向 Pod 中的**每个容器**的主进程发送 `SIGTERM`（信号 15）信号。这是一个“优雅关闭”信号，通知应用：“你即将被终止，请保存状态、完成当前工作并自行退出”。
        *   **注意**：`SIGTERM` 和 `preStop` Hook 是**并行**执行的。Kubernetes 会等待两者中的一个先完成，再进入下一步。

7.  **等待终止宽限期**
    *   在发送 `SIGTERM` 之后，Kubernetes 不会立即杀死容器。它会等待一个称为 **`terminationGracePeriodSeconds`** 的时长（默认为 30 秒）。
    *   理想情况下，容器内的应用程序捕获到 `SIGTERM` 信号后，会开始优雅关闭流程，并在宽限期内自行退出。

#### 阶段四：强制终止与清理

8.  **宽限期后的处理**：
    *   **情况A：优雅关闭成功**：如果在宽限期内，所有容器都成功停止，kubelet 会通知容器运行时清理容器资源，然后进行下一步。
    *   **情况B：优雅关闭失败**：如果宽限期结束后，容器仍未停止，kubelet 会触发强制杀死。它向容器的主进程发送 **`SIGKILL`（信号 9）** 信号，该信号无法被捕获或忽略，会立即终止进程。

9.  **清理资源**：
    *   容器被强制或优雅地终止后，kubelet 会通过容器运行时清理容器资源。
    *   同时，kubelet 会清理 Pod 的网络资源（通过 CNI 插件）和存储资源（卸载 Volume）。

10. **上报最终状态**：
    *   kubelet 向 kube-apiserver 发送最终信息，确认 Pod 已完全停止。
    *   **kube-apiserver** 随后从 **etcd** 中**正式删除**该 Pod 的对象记录。至此，这个 Pod 才真正从系统中消失。

---

### 总结流程图

用户 `kubectl delete` -> **API Server** -> **(在etcd中标记Pod为 `Terminating`)** -> **Endpoint Controller** (从Service中移除IP) -> **目标节点 kubelet** -> **执行 PreStop Hook** -> **发送 SIGTERM 信号** -> **(等待 `terminationGracePeriodSeconds`)** -> [成功则清理 / 失败则发送 **SIGKILL**] -> **清理网络/存储** -> **kubelet** -> **API Server** -> **(从etcd中删除对象)**

### 关键要点

1.  **优雅终止是核心**：Kubernetes 给了应用一个自我清理的机会，这是保证服务无损发布和滚动更新的基石。
2.  **流量切断先行**：Pod 被从 Service 的 Endpoints 中移除是第一步，这确保了在 Pod 开始关闭前，不会有新流量进来。
3.  **两个关键配置**：
    *   `terminationGracePeriodSeconds`：决定了应用有多长时间来自行关闭。
    *   `preStop Hook`：提供了一个主动执行关闭脚本的机会，比单纯等待 `SIGTERM` 更可靠。
4.  **强制终止作为保障**：如果应用无法响应优雅关闭信号，Kubernetes 有最后的强制手段来保证资源被释放。

理解这个流程对于设计健壮的、能够正确处理关闭信号的微服务至关重要。