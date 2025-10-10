+++
title = 'More than 1k Nodes'
date = 2024-03-07T15:00:59+08:00
weight = 20
+++

在这个量级上，K8s 不再只是“能跑就行”，而是进入**可扩展性、稳定性、可观测性和资源效率**的工程化挑战。下面我从架构、控制面、节点管理、网络、存储、安全和运维几个方面系统讲解。

---

## 🧠 一、总体思路：大规模集群的本质挑战

当节点规模超过 500～1000 时，Kubernetes 的瓶颈通常出现在：

* **控制平面（API Server / etcd）压力过大**；
* **调度器吞吐不足**；
* **资源对象（Pod / Node / Secret / ConfigMap 等）过多，导致 List/Watch 延迟**；
* **网络和 CNI 插件在高并发下性能下降**；
* **监控、日志、事件系统的数据量爆炸**；
* **维护和升级变得极度复杂**。

所以，大规模集群的重点是：

> **控制平面分层、节点池分区、流量隔离、观测与调优。**

---

## 🏗️ 二、控制平面（Control Plane）

### 1. etcd 优化

* **独立部署**：不要和 kube-apiserver 混布，最好是独立的高性能节点（NVMe SSD、本地盘）。
* **使用 etcd v3.5+**（性能改进明显），并开启压缩和快照机制。
* **调大 `--max-request-bytes` 和 `--quota-backend-bytes`**，避免过载。
* **定期 defrag**：可用 CronJob 自动化。
* **不要存放短生命周期对象**（例如频繁更新的 CRD 状态），可以考虑用外部缓存系统（如 Redis 或 SQL）。

### 2. API Server 扩展与保护

* 使用 **负载均衡**（HAProxy、NGINX、ELB）在多 API Server 之间分流；
* 调整：

  * `--max-mutating-requests-inflight`
  * `--max-requests-inflight`
  * `--target-ram-mb`
* 合理设置 `--request-timeout`，防止 watch 卡死；
* 限制大量 client watch 行为（Prometheus、controller-manager 等）；
* 对 client 侧使用 **aggregator** 或 **read-only proxy** 来降低负载。

### 3. Scheduler & Controller Manager

* **多调度器实例（leader election）**；
* 启用 **调度缓存（SchedulerCache）优化**；
* 调整：

  * `--kube-api-qps`、`--kube-api-burst`；
  * 调度算法的 backoff 策略；
* 对自定义 Operator 建议使用 **workqueue with rate limiters** 防止风暴。

---

## 🧩 三、节点与 Pod 管理

### 1. 节点分区与拓扑

* 按功能/位置划分 Node Pool（如 GPU/CPU/IO 密集型）；
* 使用 **Topology Spread Constraints** 避免集中调度；
* 考虑用 **Cluster Federation (KubeFed)** 或 **多个集群 + 集中管理（如 ArgoCD 多集群、Karmada、Fleet）**。

### 2. 节点生命周期

* 控制 kubelet 心跳频率 (`--node-status-update-frequency`)；
* 通过 **Node Problem Detector (NPD)** 自动标记异常节点；
* 监控 Pod eviction rate，防止节点频繁漂移；
* 启用 **graceful node shutdown** 支持。

### 3. 镜像与容器运行时

* 镜像预热（Image pre-pull）；
* 使用 **镜像仓库代理（Harbor / registry-mirror）**；
* 考虑 containerd 代替 Docker；
* 定期清理 `/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots`。

---

## 🌐 四、网络（CNI）

### 1. CNI 选择与调优

* 大规模下优选：

  * **Calico (BGP 模式)**；
  * **Cilium (eBPF)**；
  * 或使用云原生方案（AWS CNI, Azure CNI）。
* 降低 ARP / 路由表压力：

  * 使用 **IPAM 子网分段**；
  * 开启 Cilium 的 **ClusterMesh** 分层；
* 调整 `conntrack` 表大小（`net.netfilter.nf_conntrack_max`）。

### 2. Service & DNS

* 启用 **CoreDNS 缓存**；
* 对大规模 Service 场景，考虑 **Headless Service + ExternalName**；
* 优化 kube-proxy：

  * 使用 **IPVS 模式**；
  * 或 **Cilium service LB**；
* 如果 Service 数量非常多，可拆分 namespace 级 DNS 域。

---

## 💾 五、存储（CSI）

* 使用 **分布式存储系统**（Ceph、Longhorn、OpenEBS、CSI-HostPath）；
* 避免高频小 I/O 的 PVC；
* 定期清理僵尸 PV/PVC；
* 对 CSI driver 开启限流与重试机制。

---

## 🔒 六、安全与访问控制

* 开启 **RBAC 严格控制**；
* 限制 namespace 级资源上限（ResourceQuota, LimitRange）；
* 审计日志（Audit Policy）异步存储；
* 对外接口统一走 Ingress Controller；
* 如果有 Operator 或 CRD 资源暴涨，记得定期清理过期对象。

---

## 📈 七、可观测性与维护

### 1. 监控

* Prometheus 集群化（Thanos / VictoriaMetrics）；
* 不直接监控所有 Pod，可抽样或聚合；
* kube-state-metrics 与 cAdvisor 数据要限流。

### 2. 日志

* 统一日志收集（Loki / Elasticsearch / Vector）；
* 日志量控制策略（采样、压缩、清理）。

### 3. 升级与测试

* 使用 **灰度升级 / Node pool rolling**；
* 每次升级前跑 e2e 测试；
* 对控制平面单独做快照和备份（etcd snapshot）。

---

## ⚙️ 八、性能调优与实践经验

* 调整 kubelet QPS 限制：

  ```bash
  --kube-api-qps=100 --kube-api-burst=200
  ```
* 合理的 Pod 数量控制：

  * 单节点不超过 110 Pods；
  * 单 namespace 建议 < 5000 Pods；
  * 总体目标：1k 节点 → 5~10 万 Pods 以内。
* 使用 **CRD Sharding / 缩减 CRD 状态字段**；
* 避免大量短生命周期 Job，可用 CronJob + TTLController 清理。

---

## 🧭 九、扩展方向

当规模继续上升（>3000 节点）时，可以考虑：

* **多集群架构（Cluster Federation / Karmada / Rancher Fleet）**
* **控制平面分层（cell-based control plane）**
* **API Aggregation Layer + Custom Scheduler**

---

