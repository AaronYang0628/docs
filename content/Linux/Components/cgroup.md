+++
title = 'Cgroup有什么作用'
date = 2024-03-07T15:00:59+08:00
weight = 20
+++

cgroup 的功能非常丰富，除了 CPU 限制外，还提供了多种系统资源的管控能力：

## 1. 内存管理（memory）

### 1.1 内存限制
```bash
# 设置内存使用上限
echo "100M" > /sys/fs/cgroup/memory/group1/memory.limit_in_bytes

# 设置内存+Swap 上限
echo "200M" > /sys/fs/cgroup/memory/group1/memory.memsw.limit_in_bytes
```

### 1.2 内存统计和监控
```bash
# 查看内存使用情况
cat /sys/fs/cgroup/memory/group1/memory.usage_in_bytes
cat /sys/fs/cgroup/memory/group1/memory.stat
```

### 1.3 内存压力控制
```bash
# 设置内存回收压力
echo 100 > /sys/fs/cgroup/memory/group1/memory.swappiness
```

## 2. 块设备 I/O 控制（blkio）

### 2.1 I/O 带宽限制
```bash
# 限制读带宽 1MB/s
echo "8:0 1048576" > /sys/fs/cgroup/blkio/group1/blkio.throttle.read_bps_device

# 限制写带宽 2MB/s  
echo "8:0 2097152" > /sys/fs/cgroup/blkio/group1/blkio.throttle.write_bps_device
```

### 2.2 I/OPS 限制
```bash
# 限制每秒读操作数
echo "8:0 100" > /sys/fs/cgroup/blkio/group1/blkio.throttle.read_iops_device

# 限制每秒写操作数
echo "8:0 50" > /sys/fs/cgroup/blkio/group1/blkio.throttle.write_iops_device
```

### 2.3 I/O 权重分配
```bash
# 设置 I/O 优先级权重（100-1000）
echo 500 > /sys/fs/cgroup/blkio/group1/blkio.weight
```

## 3. 进程控制（pids）

### 3.1 进程数限制
```bash
# 限制最大进程数
echo 100 > /sys/fs/cgroup/pids/group1/pids.max

# 查看当前进程数
cat /sys/fs/cgroup/pids/group1/pids.current
```

## 4. 设备访问控制（devices）

### 4.1 设备权限管理
```bash
# 允许访问设备
echo "c 1:3 rwm" > /sys/fs/cgroup/devices/group1/devices.allow

# 拒绝访问设备
echo "c 1:5 rwm" > /sys/fs/cgroup/devices/group1/devices.deny
```

## 5. 网络控制（net_cls, net_prio）

### 5.1 网络流量分类
```bash
# 设置网络流量类ID
echo 0x100001 > /sys/fs/cgroup/net_cls/group1/net_cls.classid
```

### 5.2 网络优先级
```bash
# 设置网络接口优先级
echo "eth0 5" > /sys/fs/cgroup/net_prio/group1/net_prio.ifpriomap
```

## 6. 挂载点控制（devices）

### 6.1 文件系统访问限制
```bash
# 限制挂载命名空间操作
echo 1 > /sys/fs/cgroup/group1/devices.deny
```

## 7. 统一层级 cgroup v2 功能

cgroup v2 提供了更统一的管理接口：

### 7.1 资源保护
```bash
# 内存低水位线保护
echo "min 50M" > /sys/fs/cgroup/group1/memory.low

# CPU 权重保护
echo 100 > /sys/fs/cgroup/group1/cpu.weight
```

### 7.2 I/O 控制
```bash
# I/O 权重
echo "default 100" > /sys/fs/cgroup/group1/io.weight

# I/O 最大带宽
echo "8:0 rbps=1048576 wbps=2097152" > /sys/fs/cgroup/group1/io.max
```

## 8. 实际应用场景

### 8.1 容器资源限制
```dockerfile
# Docker 容器资源限制
docker run -it \
  --cpus="0.5" \
  --memory="100m" \
  --blkio-weight=500 \
  --pids-limit=100 \
  ubuntu:latest
```

### 8.2 systemd 服务限制
```ini
[Service]
MemoryMax=100M
IOWeight=500
TasksMax=100
DeviceAllow=/dev/null rw
DeviceAllow=/dev/zero rw
DeviceAllow=/dev/full rw
```

### 8.3 Kubernetes 资源管理
```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: app
    resources:
      limits:
        cpu: "500m"
        memory: "128Mi"
        ephemeral-storage: "1Gi"
      requests:
        cpu: "250m" 
        memory: "64Mi"
```

## 9. 监控和统计

### 9.1 资源使用统计
```bash
# 查看 cgroup 资源使用
cat /sys/fs/cgroup/memory/group1/memory.stat
cat /sys/fs/cgroup/cpu/group1/cpu.stat
cat /sys/fs/cgroup/io/group1/io.stat
```

### 9.2 压力状态信息
```bash
# 查看内存压力
cat /sys/fs/cgroup/memory/group1/memory.pressure
```

## 10. 高级功能

### 10.1 资源委托（cgroup v2）
```bash
# 允许子 cgroup 管理特定资源
echo "+memory +io" > /sys/fs/cgroup/group1/cgroup.subtree_control
```

### 10.2 冻结进程
```bash
# 暂停 cgroup 中所有进程
echo 1 > /sys/fs/cgroup/group1/cgroup.freeze

# 恢复执行
echo 0 > /sys/fs/cgroup/group1/cgroup.freeze
```

cgroup 的这些功能使得它成为容器化技术（如 Docker、Kubernetes）的基础，提供了完整的资源隔离、限制和统计能力，是现代 Linux 系统资源管理的核心技术。