+++
title = 'Headless VS ClusterIP'
date = 2024-03-07T15:00:59+08:00
weight = 31
+++

### Q: headless service 和 普通的service 有什么区别？ 只是有没有clusterIP?

“有没有 ClusterIP” 只是表面现象，其背后是根本不同的服务发现模式和适用场景。

---

### 核心区别：服务发现模式

*   **普通 Service**：提供的是 **“负载均衡”** 式的服务发现。
    *   它抽象了一组 Pod，你访问的是这个**抽象的、稳定的 VIP（ClusterIP）**，然后由 `kube-proxy` 将流量**转发**到后端的某个 Pod。
    *   **客户端不知道、也不关心具体是哪个 Pod 在处理请求。**
*   **Headless Service**：提供的是 **“直接 Pod IP”** 式的服务发现。
    *   它**不会**给你一个统一的 VIP，而是直接返回后端所有 Pod 的 IP 地址。
    *   **客户端可以直接与任何一个 Pod 通信，并且知道它正在和哪个具体的 Pod 对话。**

---

### 详细对比

| 特性 | 普通 Service | Headless Service |
| :--- | :--- | :--- |
| **`clusterIP` 字段** | 自动分配一个 VIP（如 `10.96.123.456`），或设置为 `None`。 | **必须设置为 `None`**。这是定义 Headless Service 的标志。 |
| **核心功能** | **负载均衡**。作为流量的代理和分发器。 | **服务发现**。作为 Pod 的 DNS 记录注册器，**不负责流量转发**。 |
| **DNS 解析结果** | 解析到 Service 的 ClusterIP。 | **解析到所有与 Selector 匹配的 Pod 的 IP 地址**。 |
| **网络拓扑** | 客户端 -> **ClusterIP (VIP)** -> (由 `kube-proxy` 负载均衡) -> 某个 Pod | 客户端 -> **Pod IP** |
| **适用场景** | 标准的微服务、Web 前端/后端 API，任何需要负载均衡的场景。 | **有状态应用集群**（如 MySQL, MongoDB, Kafka, Redis Cluster）、需要直接连接特定 Pod 的场景（如 gRPC 长连接、游戏服务器）。 |

---

### DNS 解析行为的深入理解

这是理解两者差异的最直观方式。

假设我们有一个名为 `my-app` 的 Service，它选择了 3 个 Pod。

#### 1. 普通 Service 的 DNS 解析

*   在集群内，你执行 `nslookup my-app`（或在 Pod 里用代码查询）。
*   **返回结果**：**1 条 A 记录**，指向 Service 的 ClusterIP。
    ```
    Name:      my-app
    Address 1: 10.96.123.456
    ```
*   **你的应用**：连接到 `10.96.123.456:port`，剩下的交给 Kubernetes 的网络层。

#### 2. Headless Service 的 DNS 解析

*   在集群内，你执行 `nslookup my-app`（注意：Service 的 `clusterIP: None`）。
*   **返回结果**：**多条 A 记录**，直接指向后端所有 Pod 的 IP。
    ```
    Name:      my-app
    Address 1: 172.17.0.10
    Address 2: 172.17.0.11
    Address 3: 172.17.0.12
    ```
*   **你的应用**：会拿到这个 IP 列表，并**由客户端自己决定**如何连接。比如，它可以：
    *   随机选一个。
    *   实现自己的负载均衡逻辑。
    *   需要连接所有 Pod（比如收集状态）。

---

### 与 StatefulSet 结合的“杀手级应用”

Headless Service 最经典、最强大的用途就是与 StatefulSet 配合，为**有状态应用集群**提供稳定的网络标识。

**回顾之前的 MongoDB 例子：**

*   **StatefulSet**: `mongodb` (3个副本)
*   **Headless Service**: `mongodb-service`

此时，DNS 系统会创建出**稳定且可预测的 DNS 记录**，而不仅仅是返回 IP 列表：

*   **每个 Pod 获得一个稳定的 DNS 名称**：
    *   `mongodb-0.mongodb-service.default.svc.cluster.local`
    *   `mongodb-1.mongodb-service.default.svc.cluster.local`
    *   `mongodb-2.mongodb-service.default.svc.cluster.local`

*   **查询 Headless Service 本身的 DNS** (`mongodb-service`) 会返回所有 Pod IP。

**这带来了巨大优势：**

1.  **稳定的成员身份**：在初始化 MongoDB 副本集时，你可以直接用这些稳定的 DNS 名称来配置成员列表。即使 Pod 重启、IP 变了，它的 DNS 名称永远不变，配置也就永远不会失效。
2.  **直接 Pod 间通信**：在 Kafka 或 Redis Cluster 这样的系统中，节点之间需要直接通信来同步数据。它们可以使用这些稳定的 DNS 名称直接找到对方，而不需要经过一个不必要的负载均衡器。
3.  **主从选举与读写分离**：客户端应用可以通过固定的 DNS 名称（如 `mongodb-0...`）直接连接到主节点执行写操作，而通过其他名称连接到从节点进行读操作。

---

### 总结

你可以这样形象地理解：

*   **普通 Service 像一个公司的“总机号码”**。
    *   你打电话给总机（ClusterIP），说“我要找技术支持”，接线员（`kube-proxy`）会帮你转接到一个空闲的技术支持人员（Pod）那里。你不需要知道具体是谁在为你服务。

*   **Headless Service 像一个公司的“内部通讯录”**。
    *   它不提供总机转接服务。它只给你一份所有员工（Pod）的姓名和直拨电话（IP）列表。
    *   **特别是对于 StatefulSet**，这份通讯录里的每个员工还有自己**固定、专属的座位和分机号（稳定的 DNS 名称）**，比如“张三座位在 A区-001，分机是 8001”。你知道要找谁时，直接打他的分机就行。

所以，**“有没有 ClusterIP” 只是一个开关，这个开关背后选择的是两种截然不同的服务发现和流量治理模式。** 对于需要直接寻址、有状态、集群化的应用，Headless Service 是必不可少的基石。