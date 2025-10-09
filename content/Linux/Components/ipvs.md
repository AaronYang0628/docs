+++
title = 'IPVS'
date = 2024-03-07T15:00:59+08:00
weight = 100
+++

## IPVS 是什么？

**IPVS（IP Virtual Server）** 是 Linux 内核内置的**第4层（传输层）负载均衡器**，是 LVS（Linux Virtual Server）项目的核心组件。

### 基本概念
- **工作层级**：传输层（TCP/UDP）
- **实现方式**：内核空间实现，高性能
- **功能**：将 TCP/UDP 请求负载均衡到多个真实服务器

## IPVS 的核心架构

```
客户端请求
    ↓
虚拟服务 (Virtual Service) - VIP:Port
    ↓
负载均衡调度算法
    ↓
真实服务器池 (Real Servers)
```

## IPVS 的主要作用

### 1. 高性能负载均衡
```bash
# IPVS 处理能力可达数十万并发连接
# 相比 iptables 有更好的性能表现
```

### 2. 多种负载均衡算法
```bash
# 查看支持的调度算法
grep -i ip_vs /lib/modules/$(uname -r)/modules.builtin

# 常用算法：
rr      # 轮询 (Round Robin)
wrr     # 加权轮询 (Weighted RR)
lc      # 最少连接 (Least Connection)
wlc     # 加权最少连接 (Weighted LC)
sh      # 源地址哈希 (Source Hashing)
dh      # 目标地址哈希 (Destination Hashing)
```

### 3. 多种工作模式

#### NAT 模式（网络地址转换）
```bash
# 请求和响应都经过负载均衡器
# 配置示例
ipvsadm -A -t 192.168.1.100:80 -s rr
ipvsadm -a -t 192.168.1.100:80 -r 10.244.1.10:80 -m
ipvsadm -a -t 192.168.1.100:80 -r 10.244.1.11:80 -m
```

#### DR 模式（直接路由）
```bash
# 响应直接返回客户端，不经过负载均衡器
# 高性能模式
ipvsadm -A -t 192.168.1.100:80 -s rr
ipvsadm -a -t 192.168.1.100:80 -r 10.244.1.10:80 -g
ipvsadm -a -t 192.168.1.100:80 -r 10.244.1.11:80 -g
```

#### TUN 模式（IP 隧道）
```bash
# 通过 IP 隧道转发请求
ipvsadm -A -t 192.168.1.100:80 -s rr
ipvsadm -a -t 192.168.1.100:80 -r 10.244.1.10:80 -i
ipvsadm -a -t 192.168.1.100:80 -r 10.244.1.11:80 -i
```

## IPVS 在 Kubernetes 中的应用

### kube-proxy IPVS 模式的优势
```yaml
# 性能对比
iptables: O(n) 链式查找，规则多时性能下降
ipvs:   O(1) 哈希表查找，高性能
```

### Kubernetes 中的 IPVS 配置
```bash
# 查看 kube-proxy 是否使用 IPVS 模式
kubectl -n kube-system get pods -l k8s-app=kube-proxy -o yaml | grep mode

# 查看 IPVS 规则
ipvsadm -Ln
```

## IPVS 的核心功能

### 1. 连接调度
```bash
# 不同调度算法的应用场景
rr      # 通用场景，服务器性能相近
wrr     # 服务器性能差异较大
lc      # 长连接服务，如数据库
sh      # 会话保持需求
```

### 2. 健康检查
```bash
# IPVS 本身不提供健康检查
# 需要配合 keepalived 或其他健康检查工具
```

### 3. 会话保持
```bash
# 使用源地址哈希实现会话保持
ipvsadm -A -t 192.168.1.100:80 -s sh
```

## IPVS 管理命令详解

### 基本操作
```bash
# 添加虚拟服务
ipvsadm -A -t|u|f <service-address> [-s scheduler]

# 添加真实服务器
ipvsadm -a -t|u|f <service-address> -r <server-address> [-g|i|m] [-w weight]

# 示例
ipvsadm -A -t 192.168.1.100:80 -s wlc
ipvsadm -a -t 192.168.1.100:80 -r 192.168.1.10:8080 -m -w 1
ipvsadm -a -t 192.168.1.100:80 -r 192.168.1.11:8080 -m -w 2
```

### 监控和统计
```bash
# 查看连接统计
ipvsadm -Ln --stats
ipvsadm -Ln --rate

# 查看当前连接
ipvsadm -Lnc

# 查看超时设置
ipvsadm -L --timeout
```

## IPVS 与相关技术对比

### IPVS vs iptables
| 特性 | IPVS | iptables |
|------|------|----------|
| 性能 | O(1) 哈希查找 | O(n) 链式查找 |
| 规模 | 支持大量服务 | 规则多时性能下降 |
| 功能 | 专业负载均衡 | 通用防火墙 |
| 算法 | 多种调度算法 | 简单轮询 |

### IPVS vs Nginx
| 特性 | IPVS | Nginx |
|------|------|-------|
| 层级 | 第4层 (传输层) | 第7层 (应用层) |
| 性能 | 内核级，更高 | 用户空间，功能丰富 |
| 功能 | 基础负载均衡 | 内容路由、SSL终止等 |

## 实际应用场景

### 1. Kubernetes Service 代理
```bash
# kube-proxy 为每个 Service 创建 IPVS 规则
ipvsadm -Ln
# 输出示例：
TCP  10.96.0.1:443 rr
  -> 192.168.1.10:6443    Masq    1      0          0
TCP  10.96.0.10:53 rr
  -> 10.244.0.5:53        Masq    1      0          0
```

### 2. 高可用负载均衡
```bash
# 配合 keepalived 实现高可用
# 主备负载均衡器 + IPVS
```

### 3. 数据库读写分离
```bash
# 使用 IPVS 分发数据库连接
ipvsadm -A -t 192.168.1.100:3306 -s lc
ipvsadm -a -t 192.168.1.100:3306 -r 192.168.1.20:3306 -m
ipvsadm -a -t 192.168.1.100:3306 -r 192.168.1.21:3306 -m
```

## 总结

**IPVS 的主要用途：**
1. **高性能负载均衡** - 内核级实现，处理能力强大
2. **多种调度算法** - 适应不同业务场景
3. **多种工作模式** - NAT/DR/TUN 满足不同网络需求
4. **大规模集群支持** - 适合云原生和微服务架构
5. **Kubernetes 集成** - 作为 kube-proxy 的后端，提供高效的 Service 代理

在 Kubernetes 环境中，IPVS 模式相比 iptables 模式在大规模服务下具有明显的性能优势，是生产环境推荐的负载均衡方案。