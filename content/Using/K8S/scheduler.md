

非常好的问题 👌。
Kubernetes **调度器（kube-scheduler）** 是整个系统中非常关键的组件，它负责决定 **哪个 Pod 应该运行在哪个 Node 上**。

下面我会分层、逐步详细说明 K8s 调度流程（以 v1.28+ 为例），并解释背后机制。

---

## 🌐 整体架构概览

Kubernetes 调度器主要完成以下职责：

1. **监听待调度的 Pod（即 `spec.nodeName` 为空的 Pod）**
2. **为 Pod 选择最合适的 Node**
3. **将绑定结果写回到 apiserver**

---

## 🧩 一、调度总体流程

Kubernetes 调度流程主要分为三个阶段：

```
[Pending Pod] --> [Scheduling Queue] 
     ↓
 [PreFilter] → [Filter] → [PostFilter] → [Score] → [Reserve] → [Permit] → [Bind]
```

### 1️⃣ 调度入口：监听未绑定的 Pod

* Scheduler 通过 **informer** 监听所有 `Pod` 资源。
* 当发现 Pod 没有 `spec.nodeName` 时，认为它是待调度的。
* Pod 被放入 **调度队列（SchedulingQueue）** 中。

---

## 🧮 二、调度核心阶段详解

### 🧩 1. **PreFilter 阶段**

在调度之前，对 Pod 进行一些准备性检查，例如：

* 解析 Pod 所需的资源。
* 检查 PVC、Affinity、Taint/Toleration 是否合理。
* 计算调度所需的 topology spread 信息。

🧠 类似于“预处理”，提前准备好过滤阶段要用的数据。

---

### 🧩 2. **Filter 阶段（Predicates）**

Scheduler 遍历所有可调度的 Node，筛选出满足条件的节点。

常见的过滤插件包括：

| 插件                             | 作用                         |
| ------------------------------ | -------------------------- |
| `NodeUnschedulable`            | 过滤掉被标记 `unschedulable` 的节点 |
| `NodeName`                     | 如果 Pod 指定了 nodeName，只匹配该节点 |
| `TaintToleration`              | 检查 taint / toleration 是否匹配 |
| `NodeAffinity` / `PodAffinity` | 检查亲和性/反亲和性                 |
| `NodeResourcesFit`             | 检查 CPU/Memory 等资源是否够用      |
| `VolumeBinding`                | 检查 Pod 使用的 PVC 是否能在节点挂载    |

🔎 输出结果：

> 得到一个候选节点列表（通常是几十个或几百个）。

---

### 🧩 3. **PostFilter 阶段**

* 若没有节点符合条件（即调度失败），进入 **抢占逻辑（Preemption）**。
* 调度器会尝试在某些节点上“抢占”低优先级的 Pod，以便高优先级 Pod 能调度成功。

---

### 🧩 4. **Score 阶段（优选）**

对剩余候选节点进行打分。
每个插件给节点打分（0–100），然后汇总加权。

常见的评分插件：

| 插件                   | 作用                 |
| -------------------- | ------------------ |
| `LeastAllocated`     | 资源使用最少的节点得分高       |
| `BalancedAllocation` | CPU 和内存使用更均衡的节点得分高 |
| `NodeAffinity`       | 符合 affinity 的节点加分  |
| `ImageLocality`      | 本地已缓存镜像的节点加分       |
| `InterPodAffinity`   | 满足 Pod 间亲和性需求的节点加分 |

> 这些分数会经过 **NormalizeScore** 标准化到统一范围后求和。

最终输出：

> 最优节点（Score最高）

---

### 🧩 5. **Reserve 阶段**

暂时在该节点上 **预留资源**（在调度器内部缓存中标记），防止并发调度冲突。

如果后续失败，会执行 `Unreserve` 回滚。

---

### 🧩 6. **Permit 阶段**

某些插件可在绑定前再进行校验或等待，例如：

* PodGroup（批调度）
* Scheduler Framework 自定义策略

可能返回：

* `Success` → 继续绑定
* `Wait` → 等待事件
* `Reject` → 放弃调度

---

### 🧩 7. **Bind 阶段**

最终由 **Bind 插件** 调用 API 将 Pod 绑定到 Node：

```yaml
spec:
  nodeName: node-123
```

绑定成功后，kubelet 监听到该 Pod，会拉起容器。

---

## ⚙️ 三、调度框架（Scheduler Framework）

K8s 1.19+ 后，调度器是通过 **插件化框架** 实现的。
每个阶段都有对应的插件点：

| 阶段        | 插件接口              | 示例插件              |
| --------- | ----------------- | ----------------- |
| PreFilter | `PreFilterPlugin` | PodTopologySpread |
| Filter    | `FilterPlugin`    | NodeAffinity      |
| Score     | `ScorePlugin`     | LeastAllocated    |
| Reserve   | `ReservePlugin`   | VolumeBinding     |
| Bind      | `BindPlugin`      | DefaultBinder     |

> 你可以通过写一个自定义调度插件（Go）扩展调度逻辑。

---

## 🧭 四、调度失败的情况

常见调度失败的原因：

| 原因         | 表现                       |
| ---------- | ------------------------ |
| 所有节点资源不足   | Pod 一直 Pending           |
| 亲和性限制太严格   | Pod 无法找到符合要求的节点          |
| PVC 无法绑定   | VolumeBinding 阶段失败       |
| 节点被打 taint | 没有 toleration            |
| 镜像拉取失败     | Pod 已绑定但容器起不来（kubelet问题） |

---

## 🧠 五、总结

| 阶段              | 目的       | 关键点          |
| --------------- | -------- | ------------ |
| SchedulingQueue | 缓冲待调度Pod | FIFO + 优先级调度 |
| PreFilter       | 准备数据     | 校验Pod需求      |
| Filter          | 过滤节点     | 资源与约束        |
| Score           | 打分选优     | 平衡与局部性       |
| Reserve         | 预留资源     | 防并发冲突        |
| Bind            | 绑定Node   | 调度结果落地       |

---
