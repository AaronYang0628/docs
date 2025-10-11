+++
title = 'Deployment VS ReplicaSet'
date = 2024-03-07T15:00:59+08:00
weight = 41
+++


下面我会从 **架构、工作流、控制循环、数据结构与事件链** 等层面详细说明它们是怎么工作的。

---

## 🧩 一、核心概念层次关系

先看一下层级：

```
Deployment → ReplicaSet → Pod
```

| 层级             | 职责                  | 控制器类型                      |
| -------------- | ------------------- | -------------------------- |
| **Deployment** | 负责声明“应用版本”和“滚动更新策略” | 高级控制器（managing controller） |
| **ReplicaSet** | 保证指定数量的 Pod 副本数     | 基础控制器（ensuring controller） |
| **Pod**        | 最小可调度单元，运行实际容器      | 工作负载对象                     |

可以理解为：

> **Deployment 是策略控制器，ReplicaSet 是数量控制器，Pod 是执行单元。**

---

## ⚙️ 二、Deployment 的工作原理（上层控制器）

### 1️⃣ Deployment 对象定义

你在创建一个 Deployment 时，例如：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: webapp
  template:
    metadata:
      labels:
        app: webapp
    spec:
      containers:
      - name: nginx
        image: nginx:1.25
```

这会创建一个 Deployment 对象并写入 etcd。

---

### 2️⃣ Deployment Controller 发现新对象

`kube-controller-manager` 中的 **Deployment Controller** 通过 **Informer + Shared Indexer Cache** 订阅（watch）Deployment 资源变化。

一旦发现新 Deployment，它会执行以下逻辑：

```go
syncDeployment(deployment):
    rsList := list ReplicaSets matching deployment.selector
    newRS := findReplicaSetMatchingPodTemplate(deployment.spec.template)
    if newRS == nil:
        newRS = createReplicaSet(deployment.spec.template)
    adjustReplicaCounts(newRS, oldRSList)
```

---

### 3️⃣ ReplicaSet 的创建与管理

* 如果模板（`spec.template`）发生变化（例如镜像从 `nginx:1.25` 改为 `nginx:1.26`），
  Deployment Controller 会**创建一个新的 ReplicaSet**。
* 旧 ReplicaSet 会被缩容，新的被扩容，形成**滚动更新**。

例如：

```
Deployment: webapp
 ├── ReplicaSet (nginx:1.25) — scale 2
 └── ReplicaSet (nginx:1.26) — scale 1
```

当更新完成后：

```
Deployment: webapp
 └── ReplicaSet (nginx:1.26) — scale 3
```

---

### 4️⃣ 滚动更新策略（核心逻辑）

Deployment 的滚动更新通过 `RollingUpdateDeployment` 类型实现：

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 1
    maxSurge: 1
```

控制循环每次检查：

* 有多少可用副本？
* 是否可以再启动新的 Pod（受 maxSurge 限制）？
* 是否可以终止旧 Pod（受 maxUnavailable 限制）？

Controller 会在每次 sync 时：

1. 创建新 ReplicaSet 的一个 Pod；
2. 等待其 `Ready`；
3. 再删除旧 ReplicaSet 的一个 Pod；
4. 重复直到达到目标状态。

---

### 5️⃣ ReplicaSet 与 Deployment 的“拥有关系”

Deployment 创建 ReplicaSet 时会设置 OwnerReference：

```yaml
metadata:
  ownerReferences:
  - apiVersion: apps/v1
    kind: Deployment
    name: webapp
    uid: <deployment-uid>
```

这样 kube-controller-manager 知道 **该 ReplicaSet 属于哪个 Deployment**，
而 Kubernetes 的垃圾回收器（GC Controller）会自动删除孤立的 ReplicaSet。

---

## 🧮 三、ReplicaSet 的内部机制（下层控制器）

ReplicaSet Controller 的逻辑相对简单：

```go
syncReplicaSet(rs):
    desired := rs.spec.replicas
    actual := countPodsMatchingSelector(rs.selector)
    if desired > actual:
        createPods(desired - actual)
    else if desired < actual:
        deletePods(actual - desired)
```

也就是说，ReplicaSet 只关注**Pod 数量是否符合期望**。
它并不关心版本，也不关心策略。

---

### 1️⃣ Pod 的创建

ReplicaSet Controller 调用 `PodTemplateSpec` 生成新的 Pod：

```go
pod := newPodFromTemplate(rs.spec.template)
pod.OwnerReferences = [rs.UID]
```

然后通过 API Server 创建 Pod 对象。

---

### 2️⃣ Pod 的调度与状态同步

创建后的 Pod 会由 **kube-scheduler** 调度到某个 Node 上，
`kubelet` 拉起容器后汇报状态，ReplicaSet 通过 Informer 感知到变化并更新 `status.availableReplicas`。

---

## 🧠 四、两者的控制循环（Control Loop）

可以用伪代码总结整个层次的循环：

```
while true:
  # Deployment Controller Loop
  for each Deployment:
    reconcile Deployment → ensure right ReplicaSets exist and scaled properly

  # ReplicaSet Controller Loop
  for each ReplicaSet:
    reconcile ReplicaSet → ensure correct number of Pods exist

  # Pod Controller Loop (via kubelet)
  for each Pod:
    reconcile Pod → ensure container running
```

整个系统靠 **Informer + WorkQueue + Reconcile** 实现最终一致性。
Kubernetes 的控制循环是幂等的（idempotent）——无论运行多少次，结果都一致。

---

## 🔁 五、事件链（从创建到Pod运行）

| 阶段                 | 执行者                   | 操作                      |
| ------------------ | --------------------- | ----------------------- |
| 用户                 | `kubectl apply`       | 提交 Deployment           |
| apiserver          |                       | 将 Deployment 写入 etcd    |
| controller-manager | Deployment Controller | 创建 ReplicaSet           |
| controller-manager | ReplicaSet Controller | 创建 Pod                  |
| scheduler          | kube-scheduler        | 绑定 Node                 |
| kubelet            | 节点上                   | 拉取镜像并运行容器               |
| controller-manager | Deployment Controller | 更新 ReplicaSet 状态，完成滚动更新 |

---

## 🧰 六、垃圾回收与历史版本

* Deployment 默认保留最近 10 个历史 ReplicaSet：

  ```yaml
  revisionHistoryLimit: 10
  ```
* 超过限制的旧 ReplicaSet 会自动被清理；
* 你可以通过：

  ```bash
  kubectl rollout history deployment webapp
  kubectl rollout undo deployment webapp --to-revision=2
  ```

  实现回滚。

---

## 🧩 七、关键点总结

| 项目         | Deployment      | ReplicaSet |
| ---------- | --------------- | ---------- |
| 职责         | 管理版本与更新策略       | 管理副本数量     |
| 是否直接创建 Pod | 否，通过 ReplicaSet | 是          |
| 更新策略       | 支持滚动、暂停、回滚      | 不支持        |
| 典型控制循环     | 调整 ReplicaSet   | 调整 Pod     |
| 与 Pod 的关系  | 间接控制            | 直接控制       |

---

## 💡 八、类比理解

你可以这样比喻：

> * **Deployment** = “项目经理”
>   管理不同版本的 ReplicaSet，控制滚动更新节奏。
> * **ReplicaSet** = “小组长”
>   保证自己手下（Pods）的人数正确。
> * **Pod** = “员工”
>   实际干活的单位。
