+++
title = 'QoS 详解'
date = 2024-03-07T15:00:59+08:00
weight = 170
+++

# Kubernetes QoS (Quality of Service) 等级详解

QoS 等级是 Kubernetes 用来管理 Pod 资源和**在资源不足时决定驱逐优先级**的机制。

---

## 🎯 三种 QoS 等级

Kubernetes 根据 Pod 的资源配置**自动分配** QoS 等级,共有三种:

### 1. Guaranteed (保证型) - 最高优先级
### 2. Burstable (突发型) - 中等优先级  
### 3. BestEffort (尽力而为型) - 最低优先级

---

## 📊 QoS 等级详解

### 1️⃣ Guaranteed (保证型)

#### 定义条件(必须同时满足)
- Pod 中**每个容器**(包括 Init 容器)都必须设置 `requests` 和 `limits`
- 对于每个容器,CPU 和内存的 `requests` **必须等于** `limits`

#### YAML 示例
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: guaranteed-pod
spec:
  containers:
  - name: app
    image: nginx
    resources:
      requests:
        memory: "200Mi"
        cpu: "500m"
      limits:
        memory: "200Mi"  # 必须等于 requests
        cpu: "500m"      # 必须等于 requests
```

#### 特点
✅ **资源保证**:Pod 获得请求的全部资源,不会被其他 Pod 抢占  
✅ **最高优先级**:资源不足时**最后被驱逐**  
✅ **性能稳定**:资源使用可预测,适合关键业务  
✅ **OOM 保护**:不会因为节点内存压力被 Kill(除非超过自己的 limit)

#### 适用场景
- 数据库(MySQL, PostgreSQL, Redis)
- 消息队列(Kafka, RabbitMQ)
- 核心业务应用
- 有状态服务

---

### 2️⃣ Burstable (突发型)

#### 定义条件(满足以下任一条件)
- Pod 中至少有一个容器设置了 `requests` 或 `limits`
- `requests` 和 `limits` **不相等**
- 部分容器设置了资源限制,部分没有

#### YAML 示例

**场景 1:只设置 requests**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: burstable-pod-1
spec:
  containers:
  - name: app
    image: nginx
    resources:
      requests:
        memory: "100Mi"
        cpu: "200m"
      # 没有设置 limits,可以使用超过 requests 的资源
```

**场景 2:requests < limits**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: burstable-pod-2
spec:
  containers:
  - name: app
    image: nginx
    resources:
      requests:
        memory: "100Mi"
        cpu: "200m"
      limits:
        memory: "500Mi"  # 允许突发到 500Mi
        cpu: "1000m"     # 允许突发到 1 核
```

**场景 3:混合配置**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: burstable-pod-3
spec:
  containers:
  - name: app1
    image: nginx
    resources:
      requests:
        memory: "100Mi"
      limits:
        memory: "200Mi"
  - name: app2
    image: busybox
    resources:
      requests:
        cpu: "100m"
      # 只设置 CPU,没有内存限制
```

#### 特点
✅ **弹性使用**:可以使用超过 requests 的资源(burst)  
⚠️ **中等优先级**:资源不足时,在 BestEffort 之后被驱逐  
⚠️ **可能被限流**:超过 limits 会被限制(CPU)或 Kill(内存)  
✅ **成本优化**:平衡资源保证和利用率

#### 适用场景
- Web 应用(流量有波峰波谷)
- 定时任务
- 批处理作业
- 微服务(大部分场景)

---

### 3️⃣ BestEffort (尽力而为型)

#### 定义条件
- Pod 中**所有容器**都**没有设置** `requests` 和 `limits`

#### YAML 示例
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: besteffort-pod
spec:
  containers:
  - name: app
    image: nginx
    # 完全没有 resources 配置
  - name: sidecar
    image: busybox
    # 也没有 resources 配置
```

#### 特点
❌ **无资源保证**:能用多少资源完全看节点剩余  
❌ **最低优先级**:资源不足时**第一个被驱逐**  
❌ **性能不稳定**:可能被其他 Pod 挤占资源  
✅ **灵活性高**:可以充分利用节点空闲资源

#### 适用场景
- 开发测试环境
- 非关键后台任务
- 日志收集(可以容忍中断)
- 临时性工作负载

---

## 🔍 QoS 等级判定流程图

```
开始
  │
  ├─→ 所有容器都没设置 requests/limits?
  │   └─→ 是 → BestEffort
  │
  ├─→ 所有容器的 requests == limits (CPU和内存)?
  │   └─→ 是 → Guaranteed
  │
  └─→ 其他情况 → Burstable
```

---

## 🚨 资源不足时的驱逐顺序

当节点资源不足(如内存压力)时,Kubelet 按以下顺序驱逐 Pod:

```
驱逐优先级(从高到低):

1. BestEffort Pod
   └─→ 超出 requests 最多的先被驱逐

2. Burstable Pod
   └─→ 按内存使用量排序
   └─→ 超出 requests 越多,越先被驱逐

3. Guaranteed Pod (最后才驱逐)
   └─→ 只有在没有其他选择时才驱逐
```

### 实际驱逐示例

```bash
# 节点内存不足场景:
节点总内存: 8GB
已用内存: 7.8GB (达到驱逐阈值)

Pod 列表:
- Pod A (BestEffort): 使用 1GB 内存 → 第一个被驱逐 ❌
- Pod B (Burstable):  requests=200Mi, 使用 500Mi → 第二个 ❌
- Pod C (Burstable):  requests=500Mi, 使用 600Mi → 第三个 ❌
- Pod D (Guaranteed): requests=limits=1GB, 使用 1GB → 保留 ✅
```

---

## 📝 查看 Pod 的 QoS 等级

### 方法 1:使用 kubectl describe
```bash
kubectl describe pod <pod-name>

# 输出中会显示:
# QoS Class:       Burstable
```

### 方法 2:使用 kubectl get
```bash
# 查看所有 Pod 的 QoS
kubectl get pods -o custom-columns=NAME:.metadata.name,QOS:.status.qosClass

# 输出:
# NAME              QOS
# nginx-guaranteed  Guaranteed
# app-burstable     Burstable
# test-besteffort   BestEffort
```

### 方法 3:使用 YAML 输出
```bash
kubectl get pod <pod-name> -o yaml | grep qosClass

# 输出:
# qosClass: Burstable
```

---

## 🎨 QoS 配置最佳实践

### 生产环境推荐配置

#### 关键业务 - Guaranteed
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: critical-app
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: app
        image: myapp:v1
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "2Gi"      # requests == limits
            cpu: "1000m"
```

#### 一般业务 - Burstable
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 5
  template:
    spec:
      containers:
      - name: web
        image: nginx:latest
        resources:
          requests:
            memory: "256Mi"    # 保证最低资源
            cpu: "200m"
          limits:
            memory: "512Mi"    # 允许突发到 2 倍
            cpu: "500m"
```

#### 后台任务 - BestEffort 或 Burstable
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cleanup-job
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: cleanup
            image: cleanup:v1
            resources:
              requests:
                memory: "128Mi"
                cpu: "100m"
              # 不设置 limits,允许使用空闲资源
```

---

## 🔧 QoS 与资源限制的关系

### CPU 限制行为
```yaml
resources:
  requests:
    cpu: "500m"    # 保证至少 0.5 核
  limits:
    cpu: "1000m"   # 最多使用 1 核
```

- **requests**:节点调度的依据,保证的资源
- **limits**:硬限制,超过会被**限流**(throttle),但不会被 Kill
- 超过 limits 时,进程会被 CPU throttle,导致性能下降

### 内存限制行为
```yaml
resources:
  requests:
    memory: "256Mi"  # 保证至少 256Mi
  limits:
    memory: "512Mi"  # 最多使用 512Mi
```

- **requests**:调度保证,但可以使用更多
- **limits**:硬限制,超过会触发 **OOM Kill** 💀
- Pod 会被标记为 `OOMKilled` 并重启

---

## 🛠️ 常见问题

### Q1: 为什么我的 Pod 总是被驱逐?
```bash
# 检查 QoS 等级
kubectl get pod <pod-name> -o yaml | grep qosClass

# 如果是 BestEffort 或 Burstable,建议:
# 1. 设置合理的 requests
# 2. 考虑升级到 Guaranteed(关键服务)
# 3. 增加节点资源
```

### Q2: 如何为所有 Pod 设置默认资源限制?
```yaml
# 使用 LimitRange
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: default
spec:
  limits:
  - default:              # 默认 limits
      cpu: "500m"
      memory: "512Mi"
    defaultRequest:       # 默认 requests
      cpu: "100m"
      memory: "128Mi"
    type: Container
```

### Q3: Guaranteed Pod 也会被驱逐吗?
**会!** 但只在以下情况:
- 使用超过自己的 `limits`(OOM Kill)
- 节点完全不可用(如节点宕机)
- 手动删除 Pod
- DaemonSet 或系统级 Pod 需要资源

### Q4: 如何监控 QoS 相关的问题?
```bash
# 查看节点资源压力
kubectl describe node <node-name> | grep -A 5 "Conditions:"

# 查看被驱逐的 Pod
kubectl get events --field-selector reason=Evicted

# 查看 OOM 事件
kubectl get events --field-selector reason=OOMKilling
```

---

## 📊 QoS 等级对比表

| 维度 | Guaranteed | Burstable | BestEffort |
|------|-----------|-----------|------------|
| **配置要求** | requests=limits | requests≠limits 或部分配置 | 无配置 |
| **资源保证** | ✅ 完全保证 | ⚠️ 部分保证 | ❌ 无保证 |
| **驱逐优先级** | 最低(最后驱逐) | 中等 | 最高(第一个驱逐) |
| **性能稳定性** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐ |
| **资源利用率** | 低(固定资源) | 高(可突发) | 最高(充分利用) |
| **成本** | 高 | 中 | 低 |
| **适用场景** | 关键业务 | 一般业务 | 测试/临时任务 |

---

## 🎯 选型建议

### 使用 Guaranteed 的场景
- 🗄️ 数据库(MySQL, MongoDB, Cassandra)
- 📨 消息队列(Kafka, RabbitMQ)
- 🔐 认证服务
- 💰 支付系统
- 📊 实时数据处理

### 使用 Burstable 的场景
- 🌐 Web 应用(80% 的场景)
- 🔄 API 服务
- 🎨 前端应用
- 📦 微服务
- ⚙️ 后台处理

### 使用 BestEffort 的场景
- 🧪 开发测试
- 📝 日志收集(可容忍中断)
- 🔍 数据探索
- 🛠️ 一次性脚本

---

## 💡 关键要点总结

1. **QoS 是自动分配的**,不能手动指定,由资源配置决定
2. **Guaranteed ≠ 不会被驱逐**,只是优先级最低
3. **生产环境建议至少使用 Burstable**,避免 BestEffort
4. **requests 影响调度,limits 影响运行时限制**
5. **内存超限会 OOM,CPU 超限会限流**
6. **使用 LimitRange 强制资源限制,避免 BestEffort Pod**
