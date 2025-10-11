+++
title = 'Container Principle'
date = 2024-03-07T15:00:59+08:00
weight = 160
+++


# Linux 容器技术的基础原理

容器技术是现代云原生架构的基石。让我深入讲解 Linux 容器的核心原理。

---

## 🎯 容器的本质

**容器 = 特殊的进程**

容器不是虚拟机,它本质上是宿主机上的一个**受限进程**,通过 Linux 内核的三大核心技术实现隔离和资源限制:

```
┌─────────────────────────────────────────┐
│         Linux 容器三大支柱               │
├─────────────────────────────────────────┤
│  1. Namespace (命名空间) - 隔离         │
│  2. Cgroups (控制组) - 资源限制         │
│  3. Union FS (联合文件系统) - 镜像分层   │
└─────────────────────────────────────────┘
```

---

## 🔒 Namespace (命名空间) - 视图隔离

Namespace 是 Linux 内核提供的一种**资源隔离**机制,让进程只能看到属于自己的资源。

### 七种 Namespace

| Namespace | 隔离内容 | 内核版本 | 示例 |
|-----------|---------|---------|------|
| **PID** | 进程 ID | 2.6.24 | 容器内 PID 1 = 宿主机 PID 12345 |
| **Network** | 网络栈 | 2.6.29 | 独立的 IP、端口、路由表 |
| **Mount** | 文件系统挂载点 | 2.4.19 | 独立的根目录 |
| **UTS** | 主机名和域名 | 2.6.19 | 容器有自己的 hostname |
| **IPC** | 进程间通信 | 2.6.19 | 消息队列、信号量、共享内存 |
| **User** | 用户和组 ID | 3.8 | 容器内 root ≠ 宿主机 root |
| **Cgroup** | Cgroup 根目录 | 4.6 | 隔离 cgroup 视图 |

---

### 1️⃣ PID Namespace (进程隔离)

#### 原理
每个容器有独立的进程树,容器内看不到宿主机或其他容器的进程。

#### 演示
```bash
# 在宿主机上查看进程
ps aux | grep nginx
# root  12345  nginx: master process

# 进入容器
docker exec -it my-container bash

# 在容器内查看进程
ps aux
# PID   USER     COMMAND
# 1     root     nginx: master process  ← 容器内看到的 PID 是 1
# 25    root     nginx: worker process

# 实际上宿主机上这个进程的真实 PID 是 12345
```

#### 手动创建 PID Namespace
```c
// C 代码示例
#define _GNU_SOURCE
#include <sched.h>
#include <stdio.h>
#include <unistd.h>
#include <sys/wait.h>

int child_func(void* arg) {
    printf("Child PID: %d\n", getpid());  // 输出: 1
    sleep(100);
    return 0;
}

int main() {
    printf("Parent PID: %d\n", getpid());  // 输出: 真实 PID
    
    // 创建新的 PID namespace
    char stack[1024*1024];
    int flags = CLONE_NEWPID;
    
    pid_t pid = clone(child_func, stack + sizeof(stack), flags | SIGCHLD, NULL);
    waitpid(pid, NULL, 0);
    return 0;
}
```

#### 核心特点
- 容器内第一个进程 PID = 1 (init 进程)
- 父进程(宿主机)可以看到子进程的真实 PID
- 子进程(容器)看不到父进程和其他容器的进程

---

### 2️⃣ Network Namespace (网络隔离)

#### 原理
每个容器有独立的网络栈:独立的 IP、端口、路由表、防火墙规则。

#### 架构图
```
宿主机网络栈
├─ eth0 (物理网卡)
├─ docker0 (网桥)
└─ veth pairs (虚拟网卡对)
    ├─ vethXXX (宿主机端) ←→ eth0 (容器端)
    └─ vethYYY (宿主机端) ←→ eth0 (容器端)
```

#### 演示
```bash
# 创建新的 network namespace
ip netns add myns

# 列出所有 namespace
ip netns list

# 在新 namespace 中执行命令
ip netns exec myns ip addr
# 输出: 只有 loopback,没有 eth0

# 创建 veth pair (虚拟网卡对)
ip link add veth0 type veth peer name veth1

# 将 veth1 移到新 namespace
ip link set veth1 netns myns

# 配置 IP
ip addr add 192.168.1.1/24 dev veth0
ip netns exec myns ip addr add 192.168.1.2/24 dev veth1

# 启动网卡
ip link set veth0 up
ip netns exec myns ip link set veth1 up
ip netns exec myns ip link set lo up

# 测试连通性
ping 192.168.1.2
```

#### 容器网络模式

**Bridge 模式(默认)**
```
Container A                Container B
    │                          │
  [eth0]                    [eth0]
    │                          │
 vethA ←─────┬─────────→ vethB
             │
        [docker0 网桥]
             │
         [iptables NAT]
             │
         [宿主机 eth0]
             │
          外部网络
```

**Host 模式**
```
Container
    │
    └─ 直接使用宿主机网络栈 (没有网络隔离)
```

---

### 3️⃣ Mount Namespace (文件系统隔离)

#### 原理
每个容器有独立的挂载点视图,看到不同的文件系统树。

#### 演示
```bash
# 创建隔离的挂载环境
unshare --mount /bin/bash

# 在新 namespace 中挂载
mount -t tmpfs tmpfs /tmp

# 查看挂载点
mount | grep tmpfs
# 这个挂载只在当前 namespace 可见

# 退出后,宿主机看不到这个挂载
exit
mount | grep tmpfs  # 找不到
```

#### 容器的根文件系统
```bash
# Docker 使用 chroot + pivot_root 切换根目录
# 容器内 / 实际是宿主机的某个目录

# 查看容器的根文件系统位置
docker inspect my-container | grep MergedDir
# "MergedDir": "/var/lib/docker/overlay2/xxx/merged"

# 在宿主机上访问容器文件系统
ls /var/lib/docker/overlay2/xxx/merged
# bin  boot  dev  etc  home  lib  ...
```

---

### 4️⃣ UTS Namespace (主机名隔离)

#### 演示
```bash
# 在宿主机
hostname
# host-machine

# 创建新 UTS namespace
unshare --uts /bin/bash

# 修改主机名
hostname my-container

# 查看主机名
hostname
# my-container

# 退出后,宿主机主机名不变
exit
hostname
# host-machine
```

---

### 5️⃣ IPC Namespace (进程间通信隔离)

#### 原理
隔离 System V IPC 和 POSIX 消息队列。

#### 演示
```bash
# 在宿主机创建消息队列
ipcmk -Q
# Message queue id: 0

# 查看消息队列
ipcs -q
# ------ Message Queues --------
# key        msqid      owner
# 0x52020055 0          root

# 进入容器
docker exec -it my-container bash

# 在容器内查看消息队列
ipcs -q
# ------ Message Queues --------
# (空,看不到宿主机的消息队列)
```

---

### 6️⃣ User Namespace (用户隔离)

#### 原理
容器内的 root 用户可以映射到宿主机的普通用户,增强安全性。

#### 配置示例
```bash
# 启用 User Namespace 的容器
docker run --userns-remap=default -it ubuntu bash

# 容器内
whoami
# root

id
# uid=0(root) gid=0(root) groups=0(root)

# 但在宿主机上,这个进程实际运行在普通用户下
ps aux | grep bash
# 100000  12345  bash  ← UID 100000,不是 root
```

#### UID 映射配置
```bash
# /etc/subuid 和 /etc/subgid
cat /etc/subuid
# dockremap:100000:65536
# 表示将容器内的 UID 0-65535 映射到宿主机的 100000-165535
```

---

## 📊 Cgroups (Control Groups) - 资源限制

Cgroups 用于**限制、记录、隔离**进程组的资源使用(CPU、内存、磁盘 I/O 等)。

### Cgroups 子系统

| 子系统 | 功能 | 示例 |
|--------|------|------|
| **cpu** | 限制 CPU 使用率 | 容器最多用 50% CPU |
| **cpuset** | 绑定特定 CPU 核心 | 容器只能用 CPU 0-3 |
| **memory** | 限制内存使用 | 容器最多用 512MB 内存 |
| **blkio** | 限制块设备 I/O | 容器磁盘读写 100MB/s |
| **devices** | 控制设备访问 | 容器不能访问 /dev/sda |
| **net_cls** | 网络流量分类 | 为容器流量打标签 |
| **pids** | 限制进程数量 | 容器最多创建 100 个进程 |

---

### CPU 限制

#### 原理
使用 CFS (Completely Fair Scheduler) 调度器限制 CPU 时间。

#### 关键参数
```bash
cpu.cfs_period_us  # 周期时间(默认 100ms = 100000us)
cpu.cfs_quota_us   # 配额时间

# CPU 使用率 = quota / period
# 例如: 50000 / 100000 = 50% CPU
```

#### Docker 示例
```bash
# 限制容器使用 0.5 个 CPU 核心
docker run --cpus=0.5 nginx

# 等价于
docker run --cpu-period=100000 --cpu-quota=50000 nginx

# 查看 cgroup 配置
cat /sys/fs/cgroup/cpu/docker/<container-id>/cpu.cfs_quota_us
# 50000
```

#### 手动配置 Cgroups
```bash
# 创建 cgroup
mkdir -p /sys/fs/cgroup/cpu/mycontainer

# 设置 CPU 限制为 50%
echo 50000 > /sys/fs/cgroup/cpu/mycontainer/cpu.cfs_quota_us
echo 100000 > /sys/fs/cgroup/cpu/mycontainer/cpu.cfs_period_us

# 将进程加入 cgroup
echo $$ > /sys/fs/cgroup/cpu/mycontainer/cgroup.procs

# 运行 CPU 密集任务
yes > /dev/null &

# 在另一个终端查看 CPU 使用率
top -p $(pgrep yes)
# CPU 使用率被限制在 50% 左右
```

---

### 内存限制

#### 关键参数
```bash
memory.limit_in_bytes        # 硬限制
memory.soft_limit_in_bytes   # 软限制
memory.oom_control           # OOM 行为控制
memory.usage_in_bytes        # 当前使用量
```

#### Docker 示例
```bash
# 限制容器使用最多 512MB 内存
docker run -m 512m nginx

# 查看内存限制
cat /sys/fs/cgroup/memory/docker/<container-id>/memory.limit_in_bytes
# 536870912 (512MB)

# 查看当前内存使用
cat /sys/fs/cgroup/memory/docker/<container-id>/memory.usage_in_bytes
```

#### OOM (Out of Memory) 行为
```bash
# 当容器超过内存限制时
# 1. 内核触发 OOM Killer
# 2. 杀死容器内的进程(通常是内存占用最大的)
# 3. 容器退出,状态码 137

docker ps -a
# CONTAINER ID   STATUS
# abc123         Exited (137) 1 minute ago  ← OOM killed
```

#### 避免 OOM 的策略
```bash
# 设置 OOM Score Adjustment
docker run --oom-score-adj=-500 nginx
# 数值越低,越不容易被 OOM Killer 杀死

# 禁用 OOM Killer (不推荐生产环境)
docker run --oom-kill-disable nginx
```

---

### 磁盘 I/O 限制

#### Docker 示例
```bash
# 限制读取速度为 10MB/s
docker run --device-read-bps /dev/sda:10mb nginx

# 限制写入速度为 5MB/s
docker run --device-write-bps /dev/sda:5mb nginx

# 限制 IOPS
docker run --device-read-iops /dev/sda:100 nginx
docker run --device-write-iops /dev/sda:50 nginx
```

#### 测试 I/O 限制
```bash
# 在容器内测试写入速度
docker exec -it my-container bash

dd if=/dev/zero of=/tmp/test bs=1M count=100
# 写入速度会被限制在 5MB/s
```

---

## 📦 Union FS (联合文件系统) - 镜像分层

Union FS 允许多个文件系统**分层叠加**,实现镜像的复用和高效存储。

### 核心概念

```
容器可写层 (Read-Write Layer)     ← 容器运行时的修改
─────────────────────────────────
镜像层 4 (Image Layer 4)          ← 只读
镜像层 3 (Image Layer 3)          ← 只读
镜像层 2 (Image Layer 2)          ← 只读
镜像层 1 (Base Layer)             ← 只读
─────────────────────────────────
         统一挂载点
      (Union Mount Point)
```

### 常见实现

| 文件系统 | 特点 | 使用情况 |
|---------|------|---------|
| **OverlayFS** | 性能好,内核原生支持 | Docker 默认(推荐) |
| **AUFS** | 成熟稳定,但不在主线内核 | 早期 Docker 默认 |
| **Btrfs** | 支持快照,写时复制 | 适合大规模存储 |
| **ZFS** | 企业级功能,但有许可问题 | 高级用户 |
| **Device Mapper** | 块级存储 | Red Hat 系列 |

---

### OverlayFS 原理

#### 目录结构
```bash
/var/lib/docker/overlay2/<image-id>/
├── diff/          # 当前层的文件变更
├── link           # 短链接名称
├── lower          # 指向下层的链接
├── merged/        # 最终挂载点(容器看到的)
└── work/          # 工作目录(临时文件)
```

#### 实际演示
```bash
# 查看镜像的层结构
docker image inspect nginx:latest | jq '.[0].RootFS.Layers'
# [
#   "sha256:abc123...",  ← Layer 1
#   "sha256:def456...",  ← Layer 2
#   "sha256:ghi789..."   ← Layer 3
# ]

# 启动容器
docker run -d --name web nginx

# 查看容器的文件系统
docker inspect web | grep MergedDir
# "MergedDir": "/var/lib/docker/overlay2/xxx/merged"

# 查看挂载信息
mount | grep overlay
# overlay on /var/lib/docker/overlay2/xxx/merged type overlay (rw,lowerdir=...,upperdir=...,workdir=...)
```

#### 文件操作的 Copy-on-Write (写时复制)

```bash
# 1. 读取文件(从镜像层)
docker exec web cat /etc/nginx/nginx.conf
# 直接从只读的镜像层读取,无需复制

# 2. 修改文件
docker exec web bash -c "echo 'test' >> /etc/nginx/nginx.conf"
# 触发 Copy-on-Write:
# - 从下层复制文件到容器可写层
# - 在可写层修改文件
# - 下次读取时,从可写层读取(覆盖下层)

# 3. 删除文件
docker exec web rm /var/log/nginx/access.log
# 创建 whiteout 文件,标记删除
# 文件在镜像层仍存在,但容器内看不到
```

#### Whiteout 文件(删除标记)
```bash
# 在容器可写层
ls -la /var/lib/docker/overlay2/xxx/diff/var/log/nginx/
# c--------- 1 root root 0, 0 Oct 11 10:00 .wh.access.log
# 字符设备文件,主次设备号都是 0,表示删除标记
```

---

### 镜像分层的优势

#### 1. 共享层,节省空间
```bash
# 假设有 10 个基于 ubuntu:20.04 的镜像
# 不使用分层:10 × 100MB = 1GB
# 使用分层:100MB (ubuntu base) + 10 × 10MB (应用层) = 200MB
# 节省空间:80%
```

#### 2. 快速构建
```dockerfile
FROM ubuntu:20.04                    # Layer 1 (缓存)
RUN apt-get update                   # Layer 2 (缓存)
RUN apt-get install -y nginx         # Layer 3 (缓存)
COPY app.conf /etc/nginx/            # Layer 4 (需要重建)
COPY app.js /var/www/                # Layer 5 (需要重建)

# 如果只修改 app.js,只需要重建 Layer 5
# 前面的层都从缓存读取
```

#### 3. 快速分发
```bash
# 拉取镜像时,只下载本地没有的层
docker pull nginx:1.21
# Already exists: Layer 1 (ubuntu base)
# Downloading:    Layer 2 (nginx files)
# Downloading:    Layer 3 (config)
```

---

## 🔗 容器技术完整流程

### Docker 创建容器的完整过程

```bash
docker run -d --name web \
  --cpus=0.5 \
  -m 512m \
  -p 8080:80 \
  nginx:latest
```

#### 内部执行流程

```
1. 拉取镜像(如果本地没有)
   └─ 下载各层,存储到 /var/lib/docker/overlay2/

2. 创建 Namespace
   ├─ PID Namespace (隔离进程)
   ├─ Network Namespace (隔离网络)
   ├─ Mount Namespace (隔离文件系统)
   ├─ UTS Namespace (隔离主机名)
   ├─ IPC Namespace (隔离进程间通信)
   └─ User Namespace (隔离用户)

3. 配置 Cgroups
   ├─ cpu.cfs_quota_us = 50000 (50% CPU)
   └─ memory.limit_in_bytes = 536870912 (512MB)

4. 挂载文件系统 (OverlayFS)
   ├─ lowerdir: 镜像只读层
   ├─ upperdir: 容器可写层
   ├─ workdir: 工作目录
   └─ merged: 统一视图挂载点

5. 配置网络
   ├─ 创建 veth pair
   ├─ 一端连接到容器的 Network Namespace
   ├─ 另一端连接到 docker0 网桥
   ├─ 分配 IP 地址
   └─ 配置 iptables NAT 规则 (端口映射)

6. 切换根目录
   ├─ chroot 或 pivot_root
   └─ 容器内看到的 / 是 merged 目录

7. 启动容器进程
   ├─ 在新的 Namespace 中
   ├─ 受 Cgroups 限制
   └─ 使用新的根文件系统
   └─ 执行 ENTRYPOINT/CMD

8. 容器运行中
   └─ containerd-shim 监控进程
```

---

## 🛠️ 手动创建容器(无 Docker)

### 完整示例:从零创建容器

```bash
#!/bin/bash
# 手动创建一个简单的容器

# 1. 准备根文件系统
mkdir -p /tmp/mycontainer/rootfs
cd /tmp/mycontainer/rootfs

# 下载 busybox 作为基础系统
wget https://busybox.net/downloads/binaries/1.35.0-x86_64-linux-musl/busybox
chmod +x busybox
./busybox --install -s .

# 创建必要的目录
mkdir -p bin sbin etc proc sys tmp dev

# 2. 创建启动脚本
cat > /tmp/mycontainer/start.sh <<'EOF'
#!/bin/bash

# 创建新的 namespace
unshare --pid --net --mount --uts --ipc --fork /bin/bash -c '
    # 挂载 proc
    mount -t proc proc /proc
    
    # 设置主机名
    hostname mycontainer
    
    # 启动 shell
    /bin/sh
'
EOF

chmod +x /tmp/mycontainer/start.sh

# 3. 启动容器
chroot /tmp/mycontainer/rootfs /tmp/mycontainer/start.sh
```

### 配置 Cgroups 限制
```bash
# 创建 cgroup
mkdir -p /sys/fs/cgroup/memory/mycontainer
mkdir -p /sys/fs/cgroup/cpu/mycontainer

# 设置内存限制 256MB
echo 268435456 > /sys/fs/cgroup/memory/mycontainer/memory.limit_in_bytes

# 设置 CPU 限制 50%
echo 50000 > /sys/fs/cgroup/cpu/mycontainer/cpu.cfs_quota_us
echo 100000 > /sys/fs/cgroup/cpu/mycontainer/cpu.cfs_period_us

# 将容器进程加入 cgroup
echo $CONTAINER_PID > /sys/fs/cgroup/memory/mycontainer/cgroup.procs
echo $CONTAINER_PID > /sys/fs/cgroup/cpu/mycontainer/cgroup.procs
```

---

## 🔍 容器 vs 虚拟机

### 架构对比

```
虚拟机架构:
┌─────────────────────────────────────┐
│  App A  │  App B  │  App C          │
├─────────┼─────────┼─────────────────┤
│ Bins/Libs│ Bins/Libs│ Bins/Libs      │
├─────────┼─────────┼─────────────────┤
│ Guest OS│ Guest OS│ Guest OS        │  ← 每个 VM 都有完整 OS
├─────────┴─────────┴─────────────────┤
│       Hypervisor (VMware/KVM)       │
├─────────────────────────────────────┤
│         Host Operating System       │
├─────────────────────────────────────┤
│         Hardware                    │
└─────────────────────────────────────┘

容器架构:
┌─────────────────────────────────────┐
│  App A  │  App B  │  App C          │
├─────────┼─────────┼─────────────────┤
│ Bins/Libs│ Bins/Libs│ Bins/Libs      │
├─────────────────────────────────────┤
│  Docker Engine / containerd         │
├─────────────────────────────────────┤
│    Host Operating System (Linux)    │  ← 共享内核
├─────────────────────────────────────┤
│         Hardware                    │
└─────────────────────────────────────┘
```

### 性能对比

| 维度 | 虚拟机 | 容器 |
|------|-------|------|
| **启动时间** | 分钟级 | 秒级 |
| **资源占用** | GB 级内存 | MB 级内存 |
| **性能开销** | 5-10% | < 1% |
| **隔离程度** | 完全隔离(硬件级) | 进程隔离(OS 级) |
| **安全性** | 更高(独立内核) | 较低(共享内核) |
| **密度** | 每台物理机 10-50 个 | 每台物理机 100-1000 个 |

---

## ⚠️ 容器的安全性考虑

### 1. 共享内核的风险
```bash
# 容器逃逸:如果内核有漏洞,容器可能逃逸到宿主机

# 缓解措施:
# - 使用 User Namespace
# - 运行容器为非 root 用户
# - 使用 Seccomp 限制系统调用
# - 使用 AppArmor/SELinux
```

### 2. 特权容器的危险
```bash
# 特权容器可以访问宿主机所有设备
docker run --privileged ...

# ❌ 危险:容器内可以:
# - 加载内核模块
# - 访问宿主机所有设备
# - 修改宿主机网络配置
# - 读写宿主机任意文件

# ✅ 最佳实践:避免使用特权容器
```

### 3. Capability 控制
```bash
# 只授予容器必要的权限
docker run --cap-drop ALL --cap-add NET_BIND_SERVICE nginx

# 默认 Docker 授予的 Capabilities:
# - CHOWN, DAC_OVERRIDE, FOWNER, FSETID
# - KILL, SETGID, SETUID, SETPCAP
# - NET_BIND_SERVICE, NET_RAW
# - SYS_CHROOT, MKNOD, AUDIT_WRITE, SETFCAP
```

---

## 💡 关键要点总结

### 容器 = Namespace + Cgroups + Union FS

1. **Namespace (隔离)**
   - PID: 进程隔离
   - Network: 网络隔离
   - Mount: 文件系统隔离
   - UTS: 主机名隔离
   - IPC: 进程间通信隔离
   - User: 用户隔离

2. **Cgroups (限制)**
   - CPU: 限制处理器使用
   - Memory: 限制内存使用
   - Block I/O: 限制磁盘 I/O
   - Network: 限制网络带宽

3. **Union FS (分层)**
   - 镜像分层存储
   - Copy-on-Write
   - 节省空间和带宽

### 容器不是虚拟机
- ✅ 容器是特殊的进程
- ✅ 共享宿主机内核
- ✅ 启动快、资源占用少
- ⚠️ 隔离性不如虚拟机
- ⚠️ 需要注意安全配置
