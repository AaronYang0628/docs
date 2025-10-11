+++
title = 'Talk with API Server'
date = 2024-03-07T15:00:59+08:00
weight = 201
+++

# Kubernetes 各模块与 API Server 通信详解

这是理解 Kubernetes 架构的核心问题。API Server 是整个集群的"大脑",所有组件都通过它进行通信。

---

## 🎯 Kubernetes 通信架构总览

```
┌─────────────────────────────────────────────────────────┐
│                    API Server (核心)                     │
│  - RESTful API (HTTP/HTTPS)                             │
│  - 认证、授权、准入控制                                   │
│  - etcd 唯一入口                                         │
└───────┬─────────────────┬─────────────────┬─────────────┘
        │                 │                 │
    ┌───▼───┐         ┌───▼───┐        ┌───▼────┐
    │Kubelet│         │Scheduler│      │Controller│
    │(Node) │         │         │      │ Manager  │
    └───────┘         └─────────┘      └──────────┘
        │
    ┌───▼────┐
    │kube-proxy│
    └────────┘
```

---

## 🔐 通信基础:认证、授权、准入

### 1. 认证 (Authentication)

所有组件访问 API Server 必须先通过认证。

#### 常见认证方式

| 认证方式 | 使用场景 | 实现方式 |
|---------|---------|---------|
| **X.509 证书** | 集群组件(kubelet/scheduler) | 客户端证书 |
| **ServiceAccount Token** | Pod 内应用 | JWT Token |
| **Bootstrap Token** | 节点加入集群 | 临时 Token |
| **静态 Token 文件** | 简单测试 | 不推荐生产 |
| **OIDC** | 用户认证 | 外部身份提供商 |

#### X.509 证书认证示例

```bash
# 1. API Server 启动参数包含 CA 证书
kube-apiserver \
  --client-ca-file=/etc/kubernetes/pki/ca.crt \
  --tls-cert-file=/etc/kubernetes/pki/apiserver.crt \
  --tls-private-key-file=/etc/kubernetes/pki/apiserver.key

# 2. Kubelet 使用客户端证书
kubelet \
  --kubeconfig=/etc/kubernetes/kubelet.conf \
  --client-ca-file=/etc/kubernetes/pki/ca.crt

# 3. kubeconfig 文件内容
apiVersion: v1
kind: Config
clusters:
- cluster:
    certificate-authority: /etc/kubernetes/pki/ca.crt  # CA 证书
    server: https://192.168.1.10:6443                  # API Server 地址
  name: kubernetes
users:
- name: system:node:worker-1
  user:
    client-certificate: /var/lib/kubelet/pki/kubelet-client.crt  # 客户端证书
    client-key: /var/lib/kubelet/pki/kubelet-client.key          # 客户端密钥
contexts:
- context:
    cluster: kubernetes
    user: system:node:worker-1
  name: default
current-context: default
```

#### ServiceAccount Token 认证

```bash
# Pod 内自动挂载的 Token
cat /var/run/secrets/kubernetes.io/serviceaccount/token
# eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...

# 使用 Token 访问 API Server
TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)
curl -k -H "Authorization: Bearer $TOKEN" \
  https://kubernetes.default.svc/api/v1/namespaces/default/pods
```

---

### 2. 授权 (Authorization)

认证通过后,检查是否有权限执行操作。

#### RBAC (Role-Based Access Control) - 最常用

```yaml
# 1. Role - 定义权限
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: default
  name: pod-reader
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]

---
# 2. RoleBinding - 绑定用户/ServiceAccount
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: default
subjects:
- kind: ServiceAccount
  name: my-app
  namespace: default
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

#### 授权模式对比

| 模式 | 说明 | 使用场景 |
|-----|------|---------|
| **RBAC** | 基于角色 | 生产环境(推荐) |
| **ABAC** | 基于属性 | 复杂策略(已过时) |
| **Webhook** | 外部授权服务 | 自定义授权逻辑 |
| **Node** | 节点授权 | Kubelet 专用 |
| **AlwaysAllow** | 允许所有 | 测试环境(危险) |

---

### 3. 准入控制 (Admission Control)

授权通过后,准入控制器可以修改或拒绝请求。

#### 常用准入控制器

```bash
# API Server 启用的准入控制器
kube-apiserver \
  --enable-admission-plugins=NamespaceLifecycle,LimitRanger,ServiceAccount,\
DefaultStorageClass,DefaultTolerationSeconds,MutatingAdmissionWebhook,\
ValidatingAdmissionWebhook,ResourceQuota,PodSecurityPolicy
```

| 准入控制器 | 作用 |
|-----------|------|
| **NamespaceLifecycle** | 防止在删除中的 namespace 创建资源 |
| **LimitRanger** | 强制资源限制 |
| **ResourceQuota** | 强制命名空间配额 |
| **PodSecurityPolicy** | 强制 Pod 安全策略 |
| **MutatingAdmissionWebhook** | 修改资源(如注入 sidecar) |
| **ValidatingAdmissionWebhook** | 验证资源(自定义校验) |

---

## 📡 各组件通信详解

### 1. Kubelet → API Server

Kubelet 是唯一**主动**连接 API Server 的组件。

#### 通信方式

```
Kubelet (每个 Node)
    │
    ├─→ List-Watch Pods (监听分配给自己的 Pod)
    ├─→ Report Node Status (定期上报节点状态)
    ├─→ Report Pod Status (上报 Pod 状态)
    └─→ Get Secrets/ConfigMaps (拉取配置)
```

#### 实现细节

```go
// Kubelet 启动时创建 Informer 监听资源
// 伪代码示例
func (kl *Kubelet) syncLoop() {
    // 1. 创建 Pod Informer
    podInformer := cache.NewSharedIndexInformer(
        &cache.ListWatch{
            ListFunc: func(options metav1.ListOptions) (runtime.Object, error) {
                // 列出分配给当前节点的所有 Pod
                options.FieldSelector = fields.OneTermEqualSelector("spec.nodeName", kl.nodeName).String()
                return kl.kubeClient.CoreV1().Pods("").List(context.TODO(), options)
            },
            WatchFunc: func(options metav1.ListOptions) (watch.Interface, error) {
                // 持续监听 Pod 变化
                options.FieldSelector = fields.OneTermEqualSelector("spec.nodeName", kl.nodeName).String()
                return kl.kubeClient.CoreV1().Pods("").Watch(context.TODO(), options)
            },
        },
        &v1.Pod{},
        0, // 不缓存
        cache.Indexers{},
    )
    
    // 2. 注册事件处理器
    podInformer.AddEventHandler(cache.ResourceEventHandlerFuncs{
        AddFunc:    kl.handlePodAdditions,
        UpdateFunc: kl.handlePodUpdates,
        DeleteFunc: kl.handlePodDeletions,
    })
    
    // 3. 定期上报节点状态
    go wait.Until(kl.syncNodeStatus, 10*time.Second, stopCh)
}

// 上报节点状态
func (kl *Kubelet) syncNodeStatus() {
    node := &v1.Node{
        ObjectMeta: metav1.ObjectMeta{Name: kl.nodeName},
        Status: v1.NodeStatus{
            Conditions: []v1.NodeCondition{
                {Type: v1.NodeReady, Status: v1.ConditionTrue},
            },
            Capacity: kl.getNodeCapacity(),
            // ...
        },
    }
    
    // 调用 API Server 更新节点状态
    kl.kubeClient.CoreV1().Nodes().UpdateStatus(context.TODO(), node, metav1.UpdateOptions{})
}
```

#### Kubelet 配置示例

```yaml
# /var/lib/kubelet/config.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
# API Server 连接配置(通过 kubeconfig)
authentication:
  x509:
    clientCAFile: /etc/kubernetes/pki/ca.crt
  webhook:
    enabled: true
  anonymous:
    enabled: false
authorization:
  mode: Webhook
clusterDomain: cluster.local
clusterDNS:
- 10.96.0.10
# 定期上报间隔
nodeStatusUpdateFrequency: 10s
nodeStatusReportFrequency: 1m
```

#### List-Watch 机制详解

```
┌─────────────────────────────────────────┐
│  Kubelet List-Watch 工作流程             │
├─────────────────────────────────────────┤
│                                          │
│  1. List(初始化)                         │
│     GET /api/v1/pods?fieldSelector=...  │
│     ← 返回所有当前 Pod                   │
│                                          │
│  2. Watch(持续监听)                      │
│     GET /api/v1/pods?watch=true&...     │
│     ← 保持长连接                         │
│                                          │
│  3. 接收事件                             │
│     ← ADDED: Pod nginx-xxx created      │
│     ← MODIFIED: Pod nginx-xxx updated   │
│     ← DELETED: Pod nginx-xxx deleted    │
│                                          │
│  4. 本地处理                             │
│     - 缓存更新                           │
│     - 触发 Pod 生命周期管理              │
│                                          │
│  5. 断线重连                             │
│     - 检测到连接断开                     │
│     - 重新 List + Watch                  │
│     - ResourceVersion 确保不丢事件       │
└─────────────────────────────────────────┘
```

#### HTTP 长连接(Chunked Transfer)

```bash
# Kubelet 发起 Watch 请求
GET /api/v1/pods?watch=true&resourceVersion=12345&fieldSelector=spec.nodeName=worker-1 HTTP/1.1
Host: 192.168.1.10:6443
Authorization: Bearer eyJhbGc...
Connection: keep-alive

# API Server 返回(Chunked 编码)
HTTP/1.1 200 OK
Content-Type: application/json
Transfer-Encoding: chunked

{"type":"ADDED","object":{"kind":"Pod","apiVersion":"v1",...}}
{"type":"MODIFIED","object":{"kind":"Pod","apiVersion":"v1",...}}
{"type":"DELETED","object":{"kind":"Pod","apiVersion":"v1",...}}
...
# 连接保持打开,持续推送事件
```

---

### 2. Scheduler → API Server

Scheduler 也使用 List-Watch 机制。

#### 通信流程

```
Scheduler
    │
    ├─→ Watch Pods (监听未调度的 Pod)
    │   └─ spec.nodeName == ""
    │
    ├─→ Watch Nodes (监听节点状态)
    │
    ├─→ Get PVs, PVCs (获取存储信息)
    │
    └─→ Bind Pod (绑定 Pod 到 Node)
        POST /api/v1/namespaces/{ns}/pods/{name}/binding
```

#### Scheduler 伪代码

```go
// Scheduler 主循环
func (sched *Scheduler) scheduleOne() {
    // 1. 从队列获取待调度的 Pod
    pod := sched.NextPod()
    
    // 2. 执行调度算法(过滤 + 打分)
    feasibleNodes := sched.findNodesThatFit(pod)
    if len(feasibleNodes) == 0 {
        // 无可用节点,标记为不可调度
        return
    }
    
    priorityList := sched.prioritizeNodes(pod, feasibleNodes)
    selectedNode := sched.selectHost(priorityList)
    
    // 3. 绑定 Pod 到 Node(调用 API Server)
    binding := &v1.Binding{
        ObjectMeta: metav1.ObjectMeta{
            Name:      pod.Name,
            Namespace: pod.Namespace,
        },
        Target: v1.ObjectReference{
            Kind: "Node",
            Name: selectedNode,
        },
    }
    
    // 发送 Binding 请求到 API Server
    err := sched.client.CoreV1().Pods(pod.Namespace).Bind(
        context.TODO(),
        binding,
        metav1.CreateOptions{},
    )
    
    // 4. API Server 更新 Pod 的 spec.nodeName
    // 5. Kubelet 监听到 Pod,开始创建容器
}

// Watch 未调度的 Pod
func (sched *Scheduler) watchUnscheduledPods() {
    podInformer := cache.NewSharedIndexInformer(
        &cache.ListWatch{
            ListFunc: func(options metav1.ListOptions) (runtime.Object, error) {
                // 只监听 spec.nodeName 为空的 Pod
                options.FieldSelector = "spec.nodeName="
                return sched.client.CoreV1().Pods("").List(context.TODO(), options)
            },
            WatchFunc: func(options metav1.ListOptions) (watch.Interface, error) {
                options.FieldSelector = "spec.nodeName="
                return sched.client.CoreV1().Pods("").Watch(context.TODO(), options)
            },
        },
        &v1.Pod{},
        0,
        cache.Indexers{},
    )
    
    podInformer.AddEventHandler(cache.ResourceEventHandlerFuncs{
        AddFunc: func(obj interface{}) {
            pod := obj.(*v1.Pod)
            sched.queue.Add(pod)  // 加入调度队列
        },
    })
}
```

#### Binding 请求详解

```bash
# Scheduler 发送的 HTTP 请求
POST /api/v1/namespaces/default/pods/nginx-xxx/binding HTTP/1.1
Host: 192.168.1.10:6443
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "apiVersion": "v1",
  "kind": "Binding",
  "metadata": {
    "name": "nginx-xxx",
    "namespace": "default"
  },
  "target": {
    "kind": "Node",
    "name": "worker-1"
  }
}

# API Server 处理:
# 1. 验证 Binding 请求
# 2. 更新 Pod 对象的 spec.nodeName = "worker-1"
# 3. 返回成功响应
# 4. Kubelet 监听到 Pod 更新,开始创建容器
```

---

### 3. Controller Manager → API Server

Controller Manager 包含多个控制器,每个控制器独立与 API Server 通信。

#### 常见控制器

```
Controller Manager
    │
    ├─→ Deployment Controller
    │   └─ Watch Deployments, ReplicaSets
    │
    ├─→ ReplicaSet Controller
    │   └─ Watch ReplicaSets, Pods
    │
    ├─→ Node Controller
    │   └─ Watch Nodes (节点健康检查)
    │
    ├─→ Service Controller
    │   └─ Watch Services (管理 LoadBalancer)
    │
    ├─→ Endpoint Controller
    │   └─ Watch Services, Pods (创建 Endpoints)
    │
    └─→ PV Controller
        └─ Watch PVs, PVCs (卷绑定)
```

#### ReplicaSet Controller 示例

```go
// ReplicaSet Controller 的核心逻辑
func (rsc *ReplicaSetController) syncReplicaSet(key string) error {
    // 1. 从缓存获取 ReplicaSet
    rs := rsc.rsLister.Get(namespace, name)
    
    // 2. 获取当前 Pod 列表(通过 Selector)
    allPods := rsc.podLister.List(labels.Everything())
    filteredPods := rsc.filterActivePods(rs.Spec.Selector, allPods)
    
    // 3. 计算差异
    diff := len(filteredPods) - int(*rs.Spec.Replicas)
    
    if diff < 0 {
        // 需要创建新 Pod
        diff = -diff
        for i := 0; i < diff; i++ {
            // 调用 API Server 创建 Pod
            pod := newPod(rs)
            _, err := rsc.kubeClient.CoreV1().Pods(rs.Namespace).Create(
                context.TODO(),
                pod,
                metav1.CreateOptions{},
            )
        }
    } else if diff > 0 {
        // 需要删除多余 Pod
        podsToDelete := getPodsToDelete(filteredPods, diff)
        for _, pod := range podsToDelete {
            // 调用 API Server 删除 Pod
            err := rsc.kubeClient.CoreV1().Pods(pod.Namespace).Delete(
                context.TODO(),
                pod.Name,
                metav1.DeleteOptions{},
            )
        }
    }
    
    // 4. 更新 ReplicaSet 状态
    rs.Status.Replicas = int32(len(filteredPods))
    _, err := rsc.kubeClient.AppsV1().ReplicaSets(rs.Namespace).UpdateStatus(
        context.TODO(),
        rs,
        metav1.UpdateOptions{},
    )
}
```

#### Node Controller 心跳检测

```go
// Node Controller 监控节点健康
func (nc *NodeController) monitorNodeHealth() {
    for {
        // 1. 列出所有节点
        nodes, _ := nc.kubeClient.CoreV1().Nodes().List(context.TODO(), metav1.ListOptions{})
        
        for _, node := range nodes.Items {
            // 2. 检查节点状态
            now := time.Now()
            lastHeartbeat := getNodeCondition(&node, v1.NodeReady).LastHeartbeatTime
            
            if now.Sub(lastHeartbeat.Time) > 40*time.Second {
                // 3. 节点超时,标记为 NotReady
                setNodeCondition(&node, v1.NodeCondition{
                    Type:   v1.NodeReady,
                    Status: v1.ConditionUnknown,
                    Reason: "NodeStatusUnknown",
                })
                
                // 4. 更新节点状态
                nc.kubeClient.CoreV1().Nodes().UpdateStatus(
                    context.TODO(),
                    &node,
                    metav1.UpdateOptions{},
                )
                
                // 5. 如果节点长时间 NotReady,驱逐 Pod
                if now.Sub(lastHeartbeat.Time) > 5*time.Minute {
                    nc.evictPods(node.Name)
                }
            }
        }
        
        time.Sleep(10 * time.Second)
    }
}
```

---

### 4. kube-proxy → API Server

kube-proxy 监听 Service 和 Endpoints,配置网络规则。

#### 通信流程

```
kube-proxy (每个 Node)
    │
    ├─→ Watch Services
    │   └─ 获取 Service 定义
    │
    ├─→ Watch Endpoints
    │   └─ 获取后端 Pod IP 列表
    │
    └─→ 配置本地网络
        ├─ iptables 模式:更新 iptables 规则
        ├─ ipvs 模式:更新 IPVS 规则
        └─ userspace 模式:代理转发(已废弃)
```

#### iptables 模式示例

```go
// kube-proxy 监听 Service 和 Endpoints
func (proxier *Proxier) syncProxyRules() {
    // 1. 获取所有 Service
    services := proxier.serviceStore.List()
    
    // 2. 获取所有 Endpoints
    endpoints := proxier.endpointsStore.List()
    
    // 3. 生成 iptables 规则
    for _, svc := range services {
        // Service ClusterIP
        clusterIP := svc.Spec.ClusterIP
        
        // 对应的 Endpoints
        eps := endpoints[svc.Namespace+"/"+svc.Name]
        
        // 生成 DNAT 规则
        // -A KUBE-SERVICES -d 10.96.100.50/32 -p tcp -m tcp --dport 80 -j KUBE-SVC-XXXX
        chain := generateServiceChain(svc)
        
        for _, ep := range eps.Subsets {
            for _, addr := range ep.Addresses {
                // -A KUBE-SVC-XXXX -m statistic --mode random --probability 0.33 -j KUBE-SEP-XXXX
                // -A KUBE-SEP-XXXX -p tcp -m tcp -j DNAT --to-destination 10.244.1.5:8080
                generateEndpointRule(addr.IP, ep.Ports[0].Port)
            }
        }
    }
    
    // 4. 应用 iptables 规则
    iptables.Restore(rules)
}
```

#### 生成的 iptables 规则示例

```bash
# Service: nginx-service (ClusterIP: 10.96.100.50:80)
# Endpoints: 10.244.1.5:8080, 10.244.2.8:8080

# 1. KUBE-SERVICES 链(入口)
-A KUBE-SERVICES -d 10.96.100.50/32 -p tcp -m tcp --dport 80 -j KUBE-SVC-NGINX

# 2. KUBE-SVC-NGINX 链(Service 链)
-A KUBE-SVC-NGINX -m statistic --mode random --probability 0.5 -j KUBE-SEP-EP1
-A KUBE-SVC-NGINX -j KUBE-SEP-EP2

# 3. KUBE-SEP-EP1 链(Endpoint 1)
-A KUBE-SEP-EP1 -p tcp -m tcp -j DNAT --to-destination 10.244.1.5:8080

# 4. KUBE-SEP-EP2 链(Endpoint 2)
-A KUBE-SEP-EP2 -p tcp -m tcp -j DNAT --to-destination 10.244.2.8:8080
```

---

### 5. kubectl → API Server

kubectl 是用户与 API Server 交互的客户端工具。

#### 通信流程

```
kubectl get pods
    │
    ├─→ 1. 读取 kubeconfig (~/.kube/config)
    │      - API Server 地址
    │      - 证书/Token
    │
    ├─→ 2. 发送 HTTP 请求
    │      GET /api/v1/namespaces/default/pods
    │
    ├─→ 3. API Server 处理
    │      - 认证
    │      - 授权
    │      - 从 etcd 读取数据
    │
    └─→ 4. 返回结果
           JSON 格式的 Pod 列表
```

#### kubectl 底层实现

```go
// kubectl get pods 的简化实现
func getPods(namespace string) {
    // 1. 加载 kubeconfig
    config, _ := clientcmd.BuildConfigFromFlags("", kubeconfig)
    
    // 2. 创建 Clientset
    clientset, _ := kubernetes.NewForConfig(config)
    
    // 3. 发起 GET 请求
    pods, _ := clientset.CoreV1().Pods(namespace).List(
        context.TODO(),
        metav1.ListOptions{},
    )
    
    // 4. 输出结果
    for _, pod := range pods.Items {
        fmt.Printf("%s\t%s\t%s\n", pod.Name, pod.Status.Phase, pod.Spec.NodeName)
    }
}
```

#### HTTP 请求详解

```bash
# kubectl get pods 发送的实际 HTTP 请求
GET /api/v1/namespaces/default/pods HTTP/1.1
Host: 192.168.1.10:6443
Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...
Accept: application/json
User-Agent: kubectl/v1.28.0

# API Server 响应
HTTP/1.1 200 OK
Content-Type: application/json

{
  "kind": "PodList",
  "apiVersion": "v1",
  "metadata": {
    "resourceVersion": "12345"
  },
  "items": [
    {
      "metadata": {
        "name": "nginx-xxx",
        "namespace": "default"
      },
      "spec": {
        "nodeName": "worker-1",
        "containers": [...]
      },
      "status": {
        "phase": "Running"
      }
    }
  ]
}
```

---

## 🔄 核心机制:List-Watch

List-Watch 是 Kubernetes 最核心的通信模式。

### List-Watch 架构

```
┌───────────────────────────────────────────────┐
│              Client (Kubelet/Controller)      │
├───────────────────────────────────────────────┤
│                                                │
│  1. List(初始同步)                             │
│     GET /api/v1/pods                          │
│     → 获取所有资源                             │
│     → 本地缓存(Informer Cache)                │
│                                                │
│  2. Watch(增量更新)                            │
│     GET /api/v1/pods?watch=true               │
│     → 长连接(HTTP Chunked)                    │
│     → 实时接收 ADDED/MODIFIED/DELETED 事件    │
│                                                │
│  3. ResourceVersion(一致性保证)               │
│     → 每个资源有版本号                         │
│     → Watch 从指定版本开始                     │
│     → 断线重连不丢失事件                       │
│                                                │
│  4. 本地缓存(Indexer)                         │
│     → 减少 API Server 压力                    │
│     → 快速查询                                 │
│     → 自动同步                                 │
└───────────────────────────────────────────────┘
```

### Informer 机制详解

```go
// Informer 是 List-Watch 的高级封装
type Informer struct {
    Indexer   Indexer       // 本地缓存
    Controller Controller    // List-Watch 控制器
    Processor  *sharedProcessor  // 事件处理器
}

// 使用 Informer 监听资源
func watchPodsWithInformer() {
    // 1. 创建 SharedInformerFactory
    factory := informers.NewSharedInformerFactory(clientset, 30*time.Second)
    
    // 2. 获取 Pod Informer
    podInformer := factory.Core().V1().Pods()
    
    // 3. 注册事件处理器
    podInformer.Informer().AddEventHandler(cache.ResourceEventHandlerFuncs{
        AddFunc: func(obj interface{}) {
            pod := obj.(*v1.Pod)
            fmt.Printf("Pod ADDED: %s\n", pod.Name)
        },
        UpdateFunc: func(oldObj, newObj interface{}) {
            pod := newObj.(*v1.Pod)
            fmt.Printf("Pod UPDATED: %s\n", pod.Name)
        },
        DeleteFunc: func(obj interface{}) {
            pod := obj.(*v1.Pod)
            fmt.Printf("Pod DELETED: %s\n", pod.Name)
        },
    })
    
    // 4. 启动 Informer
    factory.Start(stopCh)
    
    // 5. 等待缓存同步完成
    factory.WaitForCacheSync(stopCh)
    
    // 6. 从本地缓存查询(不访问 API Server)
    pod, _ := podInformer.Lister().Pods("default").Get("nginx-xxx")
}
```

### ResourceVersion 机制

```
事件流:
┌────────────────────────────────────────┐
│ Pod nginx-xxx created                  │ ResourceVersion: 100
├────────────────```
├────────────────────────────────────────┤
│ Pod nginx-xxx updated (image changed)  │ ResourceVersion: 101
├────────────────────────────────────────┤
│ Pod nginx-xxx updated (status changed) │ ResourceVersion: 102
├────────────────────────────────────────┤
│ Pod nginx-xxx deleted                  │ ResourceVersion: 103
└────────────────────────────────────────┘

Watch 请求:
1. 初始 Watch: GET /api/v1/pods?watch=true&resourceVersion=100
   → 从版本 100 开始接收事件

2. 断线重连: GET /api/v1/pods?watch=true&resourceVersion=102
   → 从版本 102 继续,不会丢失版本 103 的删除事件

3. 版本过期: 如果 resourceVersion 太旧(etcd 已压缩)
   → API Server 返回 410 Gone
   → Client 重新 List 获取最新状态,然后 Watch
```

---

## 🔐 通信安全细节

### 1. TLS 双向认证

```
┌────────────────────────────────────────┐
│        API Server TLS 配置              │
├────────────────────────────────────────┤
│                                         │
│  Server 端证书:                         │
│  - apiserver.crt (服务端证书)          │
│  - apiserver.key (服务端私钥)          │
│  - ca.crt (CA 证书)                    │
│                                         │
│  Client CA:                             │
│  - 验证客户端证书                       │
│  - --client-ca-file=/etc/kubernetes/pki/ca.crt │
│                                         │
│  启动参数:                              │
│  --tls-cert-file=/etc/kubernetes/pki/apiserver.crt │
│  --tls-private-key-file=/etc/kubernetes/pki/apiserver.key │
│  --client-ca-file=/etc/kubernetes/pki/ca.crt │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│        Kubelet TLS 配置                 │
├────────────────────────────────────────┤
│                                         │
│  Client 证书:                           │
│  - kubelet-client.crt (客户端证书)     │
│  - kubelet-client.key (客户端私钥)     │
│  - ca.crt (CA 证书,验证 API Server)    │
│                                         │
│  kubeconfig 配置:                       │
│  - certificate-authority: ca.crt       │
│  - client-certificate: kubelet-client.crt │
│  - client-key: kubelet-client.key      │
└────────────────────────────────────────┘
```

### 2. ServiceAccount Token 详解

```yaml
# 每个 Pod 自动挂载 ServiceAccount
apiVersion: v1
kind: Pod
metadata:
  name: my-pod
spec:
  serviceAccountName: default  # 使用的 ServiceAccount
  containers:
  - name: app
    image: nginx
    volumeMounts:
    - name: kube-api-access-xxxxx
      mountPath: /var/run/secrets/kubernetes.io/serviceaccount
      readOnly: true
  volumes:
  - name: kube-api-access-xxxxx
    projected:
      sources:
      - serviceAccountToken:
          path: token                    # JWT Token
          expirationSeconds: 3607
      - configMap:
          name: kube-root-ca.crt
          items:
          - key: ca.crt
            path: ca.crt                 # CA 证书
      - downwardAPI:
          items:
          - path: namespace
            fieldRef:
              fieldPath: metadata.namespace  # 命名空间
```

#### Pod 内访问 API Server

```bash
# 进入 Pod
kubectl exec -it my-pod -- sh

# 1. 读取 Token
TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)

# 2. 读取 CA 证书
CACERT=/var/run/secrets/kubernetes.io/serviceaccount/ca.crt

# 3. 读取命名空间
NAMESPACE=$(cat /var/run/secrets/kubernetes.io/serviceaccount/namespace)

# 4. 访问 API Server
curl --cacert $CACERT \
     --header "Authorization: Bearer $TOKEN" \
     https://kubernetes.default.svc/api/v1/namespaces/$NAMESPACE/pods

# 5. 使用 kubectl proxy(简化方式)
kubectl proxy --port=8080 &
curl http://localhost:8080/api/v1/namespaces/default/pods
```

#### ServiceAccount Token 结构

```bash
# 解码 JWT Token
TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)
echo $TOKEN | cut -d. -f2 | base64 -d | jq

# 输出:
{
  "aud": [
    "https://kubernetes.default.svc"
  ],
  "exp": 1696867200,        # 过期时间
  "iat": 1696863600,        # 签发时间
  "iss": "https://kubernetes.default.svc.cluster.local",  # 签发者
  "kubernetes.io": {
    "namespace": "default",  # 命名空间
    "pod": {
      "name": "my-pod",
      "uid": "abc-123"
    },
    "serviceaccount": {
      "name": "default",     # ServiceAccount 名称
      "uid": "def-456"
    }
  },
  "nbf": 1696863600,
  "sub": "system:serviceaccount:default:default"  # Subject
}
```

---

## 📊 通信模式总结

### 1. 主动推送 vs 被动拉取

| 组件 | 通信模式 | 说明 |
|------|---------|------|
| **Kubelet** | 主动连接 | List-Watch API Server |
| **Scheduler** | 主动连接 | List-Watch API Server |
| **Controller Manager** | 主动连接 | List-Watch API Server |
| **kube-proxy** | 主动连接 | List-Watch API Server |
| **kubectl** | 主动请求 | RESTful API 调用 |
| **API Server → etcd** | 主动读写 | gRPC 连接 etcd |

**重要**: API Server 从不主动连接其他组件,都是组件主动连接 API Server。

### 2. 通信协议

```
┌─────────────────────────────────────────┐
│  API Server 对外暴露的协议               │
├─────────────────────────────────────────┤
│                                          │
│  1. HTTPS (主要协议)                     │
│     - RESTful API                       │
│     - 端口: 6443 (默认)                  │
│     - 所有组件使用                       │
│                                          │
│  2. HTTP (不推荐)                        │
│     - 仅用于本地测试                     │
│     - 端口: 8080 (默认,已废弃)          │
│     - 生产环境禁用                       │
│                                          │
│  3. WebSocket (特殊场景)                │
│     - kubectl exec/logs/port-forward    │
│     - 基于 HTTPS 升级                    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  API Server 对 etcd 的协议               │
├─────────────────────────────────────────┤
│                                          │
│  gRPC (HTTP/2)                          │
│  - 端口: 2379                            │
│  - mTLS 双向认证                         │
│  - 高性能二进制协议                      │
└─────────────────────────────────────────┘
```

---

## 🛠️ 实战:监控各组件通信

### 1. 查看组件连接状态

```bash
# 1. 查看 API Server 监听端口
netstat -tlnp | grep kube-apiserver
# tcp   0   0 :::6443   :::*   LISTEN   12345/kube-apiserver

# 2. 查看连接到 API Server 的客户端
netstat -anp | grep :6443 | grep ESTABLISHED
# tcp   0   0 192.168.1.10:6443   192.168.1.11:45678   ESTABLISHED   (Kubelet)
# tcp   0   0 192.168.1.10:6443   192.168.1.10:45679   ESTABLISHED   (Scheduler)
# tcp   0   0 192.168.1.10:6443   192.168.1.10:45680   ESTABLISHED   (Controller Manager)

# 3. 查看 API Server 日志
journalctl -u kube-apiserver -f
# I1011 10:00:00.123456   12345 httplog.go:89] "HTTP" verb="GET" URI="/api/v1/pods?watch=true" latency="30.123ms" userAgent="kubelet/v1.28.0" srcIP="192.168.1.11:45678"

# 4. 查看 Kubelet 连接
journalctl -u kubelet -f | grep "Connecting to API"
```

### 2. 使用 tcpdump 抓包

```bash
# 抓取 API Server 通信(6443 端口)
tcpdump -i any -n port 6443 -A -s 0

# 抓取特定主机的通信
tcpdump -i any -n host 192.168.1.11 and port 6443

# 保存到文件,用 Wireshark 分析
tcpdump -i any -n port 6443 -w api-traffic.pcap
```

### 3. API Server Audit 日志

```yaml
# API Server 审计配置
apiVersion: v1
kind: Policy
rules:
# 记录所有请求元数据
- level: Metadata
  verbs: ["get", "list", "watch"]
# 记录创建/更新/删除的完整请求和响应
- level: RequestResponse
  verbs: ["create", "update", "patch", "delete"]
```

```bash
# 启用 Audit 日志
kube-apiserver \
  --audit-policy-file=/etc/kubernetes/audit-policy.yaml \
  --audit-log-path=/var/log/kubernetes/audit.log \
  --audit-log-maxage=30 \
  --audit-log-maxbackup=10 \
  --audit-log-maxsize=100

# 查看审计日志
tail -f /var/log/kubernetes/audit.log | jq

# 示例输出:
{
  "kind": "Event",
  "apiVersion": "audit.k8s.io/v1",
  "level": "Metadata",
  "auditID": "abc-123",
  "stage": "ResponseComplete",
  "requestURI": "/api/v1/namespaces/default/pods?watch=true",
  "verb": "watch",
  "user": {
    "username": "system:node:worker-1",
    "groups": ["system:nodes"]
  },
  "sourceIPs": ["192.168.1.11"],
  "userAgent": "kubelet/v1.28.0",
  "responseStatus": {
    "code": 200
  }
}
```

---

## 🔍 高级话题

### 1. API Server 聚合层 (API Aggregation)

允许扩展 API Server,添加自定义 API。

```
┌────────────────────────────────────────┐
│       Main API Server (kube-apiserver) │
│         /api, /apis                    │
└───────────────┬────────────────────────┘
                │ 代理请求
        ┌───────┴────────┐
        ▼                ▼
┌──────────────┐  ┌─────────────────┐
│ Metrics API  │  │ Custom API      │
│ /apis/metrics│  │ /apis/my.api/v1 │
└──────────────┘  └─────────────────┘
```

#### 注册 APIService

```yaml
apiVersion: apiregistration.k8s.io/v1
kind: APIService
metadata:
  name: v1beta1.metrics.k8s.io
spec:
  service:
    name: metrics-server
    namespace: kube-system
    port: 443
  group: metrics.k8s.io
  version: v1beta1
  insecureSkipTLSVerify: true
  groupPriorityMinimum: 100
  versionPriority: 100
```

#### 请求路由

```bash
# 客户端请求
kubectl top nodes
# 等价于: GET /apis/metrics.k8s.io/v1beta1/nodes

# API Server 处理:
# 1. 检查路径 /apis/metrics.k8s.io/v1beta1
# 2. 查找对应的 APIService
# 3. 代理请求到 metrics-server Service
# 4. 返回结果给客户端
```

---

### 2. API Priority and Fairness (APF)

控制 API Server 的请求优先级和并发限制。

```yaml
# FlowSchema - 定义请求匹配规则
apiVersion: flowcontrol.apiserver.k8s.io/v1beta3
kind: FlowSchema
metadata:
  name: system-nodes
spec:
  priorityLevelConfiguration:
    name: system  # 关联到优先级配置
  matchingPrecedence: 900
  distinguisherMethod:
    type: ByUser
  rules:
  - subjects:
    - kind: Group
      group:
        name: system:nodes  # 匹配 Kubelet 请求
    resourceRules:
    - verbs: ["*"]
      apiGroups: ["*"]
      resources: ["*"]
      namespaces: ["*"]

---
# PriorityLevelConfiguration - 定义并发限制
apiVersion: flowcontrol.apiserver.k8s.io/v1beta3
kind: PriorityLevelConfiguration
metadata:
  name: system
spec:
  type: Limited
  limited:
    assuredConcurrencyShares: 30  # 保证的并发数
    limitResponse:
      type: Queue
      queuing:
        queues: 64           # 队列数量
        queueLengthLimit: 50 # 每个队列长度
        handSize: 6          # 洗牌算法参数
```

#### APF 工作流程

```
请求进入 API Server
    │
    ├─→ 1. 匹配 FlowSchema (按 precedence 排序)
    │      - 检查 subject (user/group/serviceaccount)
    │      - 检查 resource (API 路径)
    │
    ├─→ 2. 确定 PriorityLevel
    │      - system (高优先级,Kubelet/Scheduler)
    │      - leader-election (中优先级,Controller Manager)
    │      - workload-high (用户请求)
    │      - catch-all (默认)
    │
    ├─→ 3. 检查并发限制
    │      - 当前并发数 < assuredConcurrencyShares: 立即执行
    │      - 超过限制: 进入队列等待
    │
    └─→ 4. 执行或拒绝
           - 队列有空位: 等待执行
           - 队列满: 返回 429 Too Many Requests
```

#### 查看 APF 状态

```bash
# 查看所有 FlowSchema
kubectl get flowschemas

# 查看 PriorityLevelConfiguration
kubectl get prioritylevelconfigurations

# 查看实时指标
kubectl get --raw /metrics | grep apiserver_flowcontrol

# 关键指标:
# apiserver_flowcontrol_current_inqueue_requests: 当前排队请求数
# apiserver_flowcontrol_rejected_requests_total: 被拒绝的请求数
# apiserver_flowcontrol_request_concurrency_limit: 并发限制
```

---

### 3. Watch Bookmark

优化 Watch 性能,减少断线重连的代价。

```go
// 启用 Watch Bookmark
watch := clientset.CoreV1().Pods("default").Watch(
    context.TODO(),
    metav1.ListOptions{
        Watch:            true,
        AllowWatchBookmarks: true,  // 🔑 启用 Bookmark
    },
)

for event := range watch.ResultChan() {
    switch event.Type {
    case watch.Added:
        // 处理新增事件
    case watch.Modified:
        // 处理修改事件
    case watch.Deleted:
        // 处理删除事件
    case watch.Bookmark:
        // 🔑 Bookmark 事件(无实际数据变更)
        // 只是告诉客户端当前的 ResourceVersion
        // 用于优化断线重连
        pod := event.Object.(*v1.Pod)
        currentRV := pod.ResourceVersion
        fmt.Printf("Bookmark at ResourceVersion: %s\n", currentRV)
    }
}
```

#### Bookmark 的作用

```
没有 Bookmark:
┌──────────────────────────────────────┐
│ 客户端 Watch 从 ResourceVersion 100  │
│ 长时间没有事件(如 1 小时)             │
│ 连接断开                              │
│ 重连时: Watch from RV 100            │
│ API Server 需要回放 100-200 之间的    │
│ 所有事件(即使客户端不需要)            │
└──────────────────────────────────────┘

有 Bookmark:
┌──────────────────────────────────────┐
│ 客户端 Watch 从 ResourceVersion 100  │
│ 每 10 分钟收到 Bookmark              │
│   RV 110 (10 分钟后)                 │
│   RV 120 (20 分钟后)                 │
│   RV 130 (30 分钟后)                 │
│ 连接断开                              │
│ 重连时: Watch from RV 130 ✅         │
│ 只需回放 130-200 之间的事件           │
└──────────────────────────────────────┘
```

---

### 4. 客户端限流 (Client-side Rate Limiting)

防止客户端压垮 API Server。

```go
// client-go 的默认限流配置
config := &rest.Config{
    Host: "https://192.168.1.10:6443",
    // QPS 限制
    QPS: 50.0,        // 每秒 50 个请求
    // Burst 限制
    Burst: 100,       // 突发最多 100 个请求
}

clientset := kubernetes.NewForConfig(config)

// 自定义限流器
import "golang.org/x/time/rate"

rateLimiter := rate.NewLimiter(
    rate.Limit(50),  // 每秒 50 个
    100,             // Burst 100
)

// 在发送请求前等待
rateLimiter.Wait(context.Background())
clientset.CoreV1().Pods("default").List(...)
```

---

## 📈 性能优化

### 1. API Server 侧优化

```bash
# API Server 启动参数
kube-apiserver \
  # 增加 worker 线程
  --max-requests-inflight=400 \
  --max-mutating-requests-inflight=200 \
  \
  # Watch 缓存大小
  --watch-cache-sizes=pods#1000,nodes#100 \
  \
  # etcd 连接池
  --etcd-servers-overrides=/events#https://etcd-1:2379 \  # 分离 events
  \
  # 启用压缩
  --enable-aggregator-routing=true \
  \
  # 内存缓存
  --default-watch-cache-size=100
```

### 2. Client 侧优化

```go
// 1. 使用 Informer (本地缓存)
factory := informers.NewSharedInformerFactory(clientset, 30*time.Second)
podInformer := factory.Core().V1().Pods()

// 从本地缓存读取,不访问 API Server
pod, _ := podInformer.Lister().Pods("default").Get("nginx")

// 2. 使用 Field Selector 减少数据量
listOptions := metav1.ListOptions{
    FieldSelector: "spec.nodeName=worker-1",  // 只获取特定节点的 Pod
}

// 3. 使用 Label Selector
listOptions := metav1.ListOptions{
    LabelSelector: "app=nginx",  // 只获取特定标签的 Pod
}

// 4. 限制返回字段
listOptions := metav1.ListOptions{
    Limit: 100,  // 分页,每次只返回 100 个
}

// 5. 批量操作
// 不推荐: 循环创建 100 个 Pod(100 次 API 调用)
for i := 0; i < 100; i++ {
    clientset.CoreV1().Pods("default").Create(...)
}

// 推荐: 使用 Job/Deployment(1 次 API 调用)
deployment := &appsv1.Deployment{
    Spec: appsv1.DeploymentSpec{
        Replicas: int32Ptr(100),
        ...
    },
}
clientset.AppsV1().Deployments("default").Create(deployment)
```

---

## 💡 关键要点总结

### 通信模式
1. **所有组件主动连接 API Server** (API Server 从不主动推送)
2. **List-Watch 是核心机制** (初始 List + 持续 Watch)
3. **HTTP 长连接** (Chunked Transfer Encoding)
4. **ResourceVersion 保证一致性** (断线重连不丢事件)

### 认证授权
1. **X.509 证书** (集群组件)
2. **ServiceAccount Token** (Pod 内应用)
3. **RBAC 授权** (细粒度权限控制)
4. **准入控制** (请求验证和修改)

### 性能优化
1. **Informer 本地缓存** (减少 API Server 压力)
2. **Field/Label Selector** (减少数据传输)
3. **APF 流量控制** (防止 API Server 过载)
4. **客户端限流** (防止客户端压垮 API Server)

### 最佳实践
1. **使用 Informer 而不是轮询**
2. **合理设置 QPS 和 Burst**
3. **避免频繁的 List 操作**
4. **使用 Field Selector 过滤数据**
5. **启用 Watch Bookmark**
6. **监控 API Server 指标**
