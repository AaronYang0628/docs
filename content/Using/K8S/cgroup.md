+++
title = 'Cgroup在K8S中起什么作用'
date = 2024-03-07T15:00:59+08:00
weight = 20
+++


Kubernetes 深度集成 cgroup 来实现容器资源管理和隔离。以下是 cgroup 与 K8s 结合的详细方式：

## 1. K8s 资源模型与 cgroup 映射

### 1.1 资源请求和限制
```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: app
    resources:
      requests:
        memory: "64Mi"
        cpu: "250m"
      limits:
        memory: "128Mi"
        cpu: "500m"
        ephemeral-storage: "2Gi"
```

**对应 cgroup 配置：**
- `cpu.shares` = 256 (250m × 1024 / 1000)
- `cpu.cfs_quota_us` = 50000 (500m × 100000 / 1000)
- `memory.limit_in_bytes` = 134217728 (128Mi)

## 2. K8s cgroup 驱动

### 2.1 cgroupfs 驱动
```bash
# kubelet 配置
--cgroup-driver=cgroupfs
--cgroup-root=/sys/fs/cgroup
```

### 2.2 systemd 驱动（推荐）
```bash
# kubelet 配置
--cgroup-driver=systemd
--cgroup-root=/sys/fs/cgroup
```

## 3. K8s cgroup 层级结构

### 3.1 cgroup v1 层级
```
/sys/fs/cgroup/
├── cpu,cpuacct/kubepods/
│   ├── burstable/pod-uid-1/
│   │   ├── container-1/
│   │   └── container-2/
│   └── guaranteed/pod-uid-2/
│       └── container-1/
├── memory/kubepods/
└── pids/kubepods/
```

### 3.2 cgroup v2 统一层级
```
/sys/fs/cgroup/kubepods/
├── pod-uid-1/
│   ├── container-1/
│   └── container-2/
└── pod-uid-2/
    └── container-1/
```

## 4. QoS 等级与 cgroup 配置

### 4.1 Guaranteed (最高优先级)
```yaml
resources:
  limits:
    cpu: "500m"
    memory: "128Mi"
  requests:
    cpu: "500m" 
    memory: "128Mi"
```

**cgroup 配置：**
- `cpu.shares` = 512
- `cpu.cfs_quota_us` = 50000
- `oom_score_adj` = -998

### 4.2 Burstable (中等优先级)
```yaml
resources:
  requests:
    cpu: "250m"
    memory: "64Mi"
  # limits 未设置或大于 requests
```

**cgroup 配置：**
- `cpu.shares` = 256
- `cpu.cfs_quota_us` = -1 (无限制)
- `oom_score_adj` = 2-999

### 4.3 BestEffort (最低优先级)
```yaml
# 未设置 resources
```

**cgroup 配置：**
- `cpu.shares` = 2
- `memory.limit_in_bytes` = 9223372036854771712 (极大值)
- `oom_score_adj` = 1000

## 5. 实际 cgroup 配置示例

### 5.1 查看 Pod 的 cgroup
```bash
# 找到 Pod 的 cgroup 路径
cat /sys/fs/cgroup/cpu/kubepods/pod-uid-1/cgroup.procs

# 查看 CPU 配置
cat /sys/fs/cgroup/cpu/kubepods/pod-uid-1/cpu.shares
cat /sys/fs/cgroup/cpu/kubepods/pod-uid-1/cpu.cfs_quota_us

# 查看内存配置
cat /sys/fs/cgroup/memory/kubepods/pod-uid-1/memory.limit_in_bytes
```

### 5.2 使用 cgroup-tools 监控
```bash
# 安装工具
apt-get install cgroup-tools

# 查看 cgroup 统计
cgget -g cpu:/kubepods/pod-uid-1
cgget -g memory:/kubepods/pod-uid-1
```

## 6. K8s 特性与 cgroup 集成

### 6.1 垂直 Pod 自动缩放 (VPA)
```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
spec:
  targetRef:
    apiVersion: "apps/v1"
    kind: Deployment
    name: my-app
  updatePolicy:
    updateMode: "Auto"
```

VPA 根据历史使用数据动态调整：
- 修改 `resources.requests` 和 `resources.limits`
- kubelet 更新对应的 cgroup 配置

### 6.2 水平 Pod 自动缩放 (HPA)
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  minReplicas: 1
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 50
```

HPA 依赖 cgroup 的 CPU 使用率统计进行决策。

### 6.3 资源监控
```bash
# 通过 cgroup 获取容器资源使用
cat /sys/fs/cgroup/cpu/kubepods/pod-uid-1/cpuacct.usage
cat /sys/fs/cgroup/memory/kubepods/pod-uid-1/memory.usage_in_bytes

# 使用 metrics-server 收集
kubectl top pods
kubectl top nodes
```

## 7. 节点资源管理

### 7.1 系统预留资源
```yaml
# kubelet 配置
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
systemReserved:
  cpu: "100m"
  memory: "256Mi"
  ephemeral-storage: "1Gi"
kubeReserved:
  cpu: "200m"
  memory: "512Mi"
  ephemeral-storage: "2Gi"
evictionHard:
  memory.available: "100Mi"
  nodefs.available: "10%"
```

### 7.2 驱逐策略
当节点资源不足时，kubelet 根据 cgroup 统计：
- 监控 `memory.usage_in_bytes`
- 监控 `cpuacct.usage`
- 触发 Pod 驱逐

## 8. 故障排查和调试

### 8.1 检查 cgroup 配置
```bash
# 进入节点检查
docker exec -it node-shell /bin/bash

# 查看 Pod cgroup
find /sys/fs/cgroup -name "*pod-uid*" -type d

# 检查资源限制
cat /sys/fs/cgroup/memory/kubepods/pod-uid-1/memory.limit_in_bytes
cat /sys/fs/cgroup/cpu/kubepods/pod-uid-1/cpu.cfs_quota_us
```

### 8.2 监控 OOM 事件
```bash
# 查看内核日志
dmesg | grep -i "killed process"

# 查看 cgroup OOM 事件
grep "kubepods" /var/log/kern.log | grep -i oom
```

## 9. 最佳实践

### 9.1 合理设置资源限制
```yaml
resources:
  requests:
    cpu: "100m"
    memory: "128Mi"
  limits:
    cpu: "200m"    # 不要设置过大
    memory: "256Mi" # 避免内存浪费
```

### 9.2 使用 LimitRange
```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: mem-limit-range
spec:
  limits:
  - default:
      memory: "256Mi"
    defaultRequest:
      memory: "128Mi"
    type: Container
```

cgroup 是 K8s 资源管理的基石，通过精细的 cgroup 配置，K8s 实现了多租户环境下的资源隔离、公平调度和稳定性保障。