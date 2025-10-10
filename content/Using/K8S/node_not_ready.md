+++
title = 'Node NotReady'
date = 2024-03-07T15:00:59+08:00
weight = 20
+++


当 Kubernetes 中某些 Node 节点状态变为 **`NotReady`** 时，这往往意味着 kubelet 无法与控制平面（API Server）正常通信，或该节点上某些关键组件/资源异常。

我们可以从以下两个层面来分析：
1️⃣ **导致节点 NotReady 的常见原因**
2️⃣ **NotReady 状态对整个集群和业务的影响**

---

## 🧩 一、Node `NotReady` 的常见原因分类

> kubelet 每 10 秒（默认）向 API Server 报告一次心跳（NodeStatus）。
> 如果连续 40 秒（默认 `--node-monitor-grace-period=40s`）没有收到更新，Controller Manager 会将节点标记为 `NotReady`。

下面按类别详细分析👇

---

### 🖧 1. 网络层异常（最常见）

**症状**：节点能 ping 通外网，但与 control plane 交互超时。
**原因包括：**

* 节点与 kube-apiserver 之间的网络中断（如防火墙、路由异常、VPC 问题）；
* API Server 负载均衡异常（L4/L7 LB 停止转发流量）；
* Pod 网络插件（CNI）崩溃，kubelet 无法汇报 Pod 状态；
* 节点 DNS 解析异常（影响 kubelet 访问 API Server）。

**排查方式：**

```bash
# 在节点上检查 API Server 可达性
curl -k https://<apiserver-ip>:6443/healthz
# 检查 kubelet 日志
journalctl -u kubelet | grep -E "error|fail|timeout"
```

---

### ⚙️ 2. kubelet 本身异常

**症状**：节点长时间 NotReady，重启 kubelet 后恢复。

**原因包括：**

* kubelet 崩溃 / 死循环；
* 磁盘满，导致 kubelet 无法写临时目录（`/var/lib/kubelet`）；
* 证书过期（`/var/lib/kubelet/pki/kubelet-client-current.pem`）；
* CPU/Mem 资源耗尽，kubelet 被 OOM；
* kubelet 配置文件被改动，重启后加载失败。

**排查方式：**

```bash
systemctl status kubelet
journalctl -u kubelet -n 100
df -h /var/lib/kubelet
```

---

### 💾 3. 节点资源耗尽

**症状**：Node 状态为 `NotReady` 或 `Unknown`，Pod 被驱逐。

**可能原因：**

* 磁盘使用率 > 90%，触发 kubelet `DiskPressure`；
* 内存 / CPU 长期 100%，触发 `MemoryPressure`；
* inode 用尽（`df -i`）；
* 临时目录 `/var/lib/docker/tmp` 或 `/tmp` 爆满。

**排查方式：**

```bash
kubectl describe node <node-name>
# 查看 conditions
# Conditions:
#   Type              Status
#   ----              ------
#   MemoryPressure    True
#   DiskPressure      True
```

---

### 🧱 4. 控制面通信问题（API Server / Controller Manager）

**症状**：多个节点同时 `NotReady`。

**可能原因：**

* API Server 压力过大，导致心跳包无法及时处理；
* etcd 异常（写延迟高）；
* Controller Manager 无法更新 NodeStatus；
* 集群负载均衡器（如 haproxy）挂掉。

**排查方式：**

```bash
kubectl get componentstatuses
# 或直接检查控制平面节点
kubectl -n kube-system get pods -l tier=control-plane
```

---

### 🔌 5. 容器运行时 (containerd/docker/crio) 异常

**症状**：kubelet 报 "Failed to list pod sandbox"。

**原因包括：**

* containerd 服务挂掉；
* 版本不兼容（kubelet 与 runtime 版本差异过大）；
* runtime socket 权限错误；
* overlayfs 损坏；
* `/var/lib/containerd` 或 `/run/containerd` 文件系统只读。

**排查方式：**

```bash
systemctl status containerd
journalctl -u containerd | tail
crictl ps
```

---

### ⏱️ 6. 时间同步错误

**症状**：kubelet 心跳被判定过期，但实际节点正常。

**原因：**

* 节点时间漂移（未启用 NTP / chrony）；
* 控制面和节点时间差 > 5 秒；
* TLS 校验失败（证书时间不合法）。

---

### 🧰 7. 节点维护或人为操作

**包括：**

* 节点被 cordon/drain；
* 网络策略阻断 kubelet；
* 人为停掉 kubelet；
* 节点被重装后未清理旧状态（Node UID 冲突）。

---

## ⚠️ 二、Node NotReady 的后果与影响

| 影响范围                        | 描述                                                                                |
| --------------------------- | --------------------------------------------------------------------------------- |
| **1️⃣ Pod 调度**              | Scheduler 会避免调度新 Pod 到该节点。                                                        |
| **2️⃣ Pod 驱逐**              | Controller Manager 默认在节点 NotReady 超过 `300s`（`--pod-eviction-timeout`）后，会驱逐所有 Pod。 |
| **3️⃣ Service Endpoint 缺失** | 该节点上运行的 Pod 从 Service Endpoint 列表中移除，导致负载均衡流量下降。                                  |
| **4️⃣ DaemonSet 中断**        | DaemonSet Controller 不再在该节点上创建/管理 Pod。                                            |
| **5️⃣ 数据丢失风险**              | 若节点上的 Pod 使用本地卷（emptyDir、hostPath），被驱逐后数据会丢失。                                     |
| **6️⃣ 集群监控告警**              | Prometheus / Alertmanager 触发告警（如 `KubeNodeNotReady`、`KubeletDown`）。               |
| **7️⃣ 自动扩缩容失效**             | Cluster Autoscaler 无法正确评估资源利用率。                                                   |

---

## 🧭 三、最佳实践与预防建议

1. **启用 Node Problem Detector (NPD)** 自动标记系统级异常；
2. **监控 NodeConditions**（`Ready`、`MemoryPressure`、`DiskPressure`）；
3. **统一节点健康检查策略**（如通过 `taints` 与 `tolerations`）；
4. **自动修复机制**：

   * 结合 Cluster API 或自研 Controller 实现 Node 自动替换；
   * 若节点 NotReady 超过 10 分钟，自动重建；
5. **定期巡检：**

   * kubelet、containerd 状态；
   * 系统时间同步；
   * 磁盘使用率；
   * API Server QPS 和 etcd 延迟。

