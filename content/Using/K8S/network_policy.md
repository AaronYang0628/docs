+++
title = 'Network Policy'
date = 2024-03-07T15:00:59+08:00
weight = 140
+++


### 1. Network Policy 的设计原理

Kubernetes Network Policy 的设计核心思想是：**在默认允许的集群网络中，引入一个“默认拒绝”的、声明式的、基于标签的防火墙**。

让我们来分解这个核心思想：

1.  **从“默认允许”到“默认拒绝”**
    *   **默认行为**：在没有任何 Network Policy 的情况下，Kubernetes 集群内的 Pod 之间是可以自由通信的（取决于 CNI 插件），甚至来自外部的流量也可能直接访问到 Pod。这就像在一个没有防火墙的开放网络里。
    *   **Network Policy 的作用**：一旦在某个 Namespace 中创建了一个 Network Policy，它就会像一个“开关”，将这个 Namespace 或特定 Pod 的默认行为变为 **“默认拒绝”**。之后，只有策略中明确允许的流量才能通过。

2.  **声明式模型**
    *   和其他的 Kubernetes 资源（如 Deployment、Service）一样，Network Policy 也是声明式的。你只需要告诉 Kubernetes“你期望的网络状态是什么”（例如，“允许来自带有 `role=frontend` 标签的 Pod 的流量访问带有 `role=backend` 标签的 Pod 的 6379 端口”），而不需要关心如何通过 iptables 或 eBPF 命令去实现它。Kubernetes 和其下的 CNI 插件会负责实现你的声明。

3.  **基于标签的选择机制**
    *   这是 Kubernetes 的核心设计模式。Network Policy 不关心 Pod 的 IP 地址，因为 IP 是动态且易变的。它通过 **标签** 来选择一组 Pod。
    *   `podSelector`： 选择策略所应用的 Pod（即目标 Pod）。
    *   `namespaceSelector`： 根据命名空间的标签来选择来源或目标命名空间。
    *   `namespaceSelector` 和 `podSelector` 可以组合使用，实现非常精细的访问控制。

4.  **策略是叠加的**
    *   多个 Network Policy 可以同时作用于同一个 Pod。最终的规则是所有相关策略的 **并集**。如果任何一个策略允许了某条流量，那么该流量就是被允许的。这意味着你可以分模块、分层次地定义策略，而不会相互覆盖。

---

### 2. Network Policy 的实现方式

一个非常重要的概念是：**Network Policy 本身只是一个 API 对象，它定义了一套规范。它的具体实现依赖于 Container Network Interface 插件。**

Kubernetes 不会自己实现网络策略，而是由 CNI 插件来负责。这意味着：

*   **如果你的 CNI 插件不支持 Network Policy，那么你创建的 Policy 将不会产生任何效果。**
*   不同的 CNI 插件使用不同的底层技术来实现相同的 Network Policy 规范。

主流的实现方式和技术包括：

1.  **基于 iptables**
    *   **工作原理**：CNI 插件（如 Calico 的部分模式、Weave Net 等）会监听 Kubernetes API，当有 Network Policy 被创建时，它会在节点上生成相应的 iptables 规则。这些规则会对进出 Pod 网络接口（veth pair）的数据包进行过滤。
    *   **优点**：成熟、稳定、通用。
    *   **缺点**：当策略非常复杂时，iptables 规则链会变得很长，可能对性能有一定影响。

2.  **基于 eBPF**
    *   **工作原理**：这是更现代和高效的方式，被 Cilium 等项目广泛采用。eBPF 允许将程序直接注入到 Linux 内核中，在内核层面高效地执行数据包过滤、转发和策略检查。
    *   **优点**：高性能、灵活性极强（可以实现 L3/L4/L7 所有层面的策略）、对系统影响小。
    *   **缺点**：需要较新的 Linux 内核版本。

3.  **基于 IPVS 或自有数据平面**
    *   一些 CNI 插件（如 Antrea，它底层使用 OVS）可能有自己独立的数据平面，并在其中实现策略的匹配和执行。

**常见的支持 Network Policy 的 CNI 插件：**
*   **Calico**： 功能强大，支持复杂的网络策略，既可以使用 iptables 模式也可以使用 eBPF 模式。
*   **Cilium**： 基于 eBPF，原生支持 Network Policy，并扩展到了 L7（HTTP、gRPC 等）网络策略。
*   **Weave Net**： 提供了对 Kubernetes Network Policy 的基本支持。
*   **Antrea**： 基于 Open vSwitch，也提供了强大的策略支持。

---

### 3. Network Policy 的用途

Network Policy 是实现 Kubernetes **“零信任”** 或 **“微隔离”** 安全模型的核心工具。其主要用途包括：

1.  **实现最小权限原则**
    *   这是最核心的用途。通过精细的策略，确保一个 Pod 只能与它正常工作所 **必需** 的其他 Pod 或外部服务通信，除此之外的一切连接都被拒绝。这极大地减少了攻击面。

2.  **隔离多租户环境**
    *   在共享的 Kubernetes 集群中，可以为不同的团队、项目或环境（如 dev, staging）创建不同的命名空间。然后使用 Network Policy 严格限制跨命名空间的访问，确保它们相互隔离，互不干扰。

3.  **保护关键基础服务**
    *   数据库、缓存（如 Redis）、消息队列等后端服务通常不应该被所有 Pod 访问。可以创建策略，只允许特定的前端或中间件 Pod（通过标签选择）访问这些后端服务的特定端口。

    ```yaml
    # 示例：只允许 role=api 的 Pod 访问 role=db 的 Pod 的 5432 端口
    apiVersion: networking.k8s.io/v1
    kind: NetworkPolicy
    metadata:
      name: allow-api-to-db
    spec:
      podSelector:
        matchLabels:
          role: db
      policyTypes:
      - Ingress
      ingress:
      - from:
        - podSelector:
            matchLabels:
              role: api
        ports:
        - protocol: TCP
          port: 5432
    ```

4.  **控制外部访问**
    *   使用 `ipBlock` 字段，可以限制只有来自特定 IP 段（例如公司办公室的 IP）的流量才能访问集群内部的服务。这可以用来替代或补充传统的防火墙规则。

5.  **划分应用层次安全边界**
    *   在一个典型的 Web 应用中，可以创建清晰的层次：
        *   **前端层**： 可以接收来自外部的流量（80/443端口），但只能与后端层通信。
        *   **后端层**： 只能接收来自前端层的流量，并只能与数据层通信。
        *   **数据层**： 只能接收来自后端层的流量，不接受任何其他来源的请求。

### 总结

| 特性 | 描述 |
| :--- | :--- |
| **设计原理** | 在默认允许的网络中，通过声明式和基于标签的机制，实现“默认拒绝”的精细流量控制。 |
| **实现方式** | 由 CNI 插件负责实现，底层技术包括 **iptables**、**eBPF** 等。策略本身是 Kubernetes 的 API 资源。 |
| **主要用途** | 实现**微隔离**、**最小权限原则**、**多租户隔离**、**保护关键服务**和**控制外部访问**，是 Kubernetes 网络安全的基石。 |

简单来说，**Network Policy 就是 Kubernetes 世界的防火墙规则**，它让你能够定义“谁在什么条件下可以访问什么”，是生产环境中保障应用安全不可或缺的一部分。