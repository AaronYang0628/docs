+++
title = 'Ingress'
date = 2024-03-07T15:00:59+08:00
weight = 90
+++

# Kubernetes Ingress 原理详解

Ingress 是 Kubernetes 中用于管理**集群外部访问集群内服务**的 API 对象,提供 HTTP/HTTPS 路由功能。

---

## 🎯 Ingress 的作用

### 没有 Ingress 的问题

```
问题 1:每个服务需要一个 LoadBalancer
┌────────────────────────────────────┐
│  Service A (LoadBalancer)  $$$     │
│  Service B (LoadBalancer)  $$$     │
│  Service C (LoadBalancer)  $$$     │
└────────────────────────────────────┘
成本高、管理复杂、IP 地址浪费

问题 2:无法基于域名/路径路由
客户端 → NodePort:30001 (Service A)
客户端 → NodePort:30002 (Service B)
需要记住不同的端口,不友好
```

### 使用 Ingress 的方案

```
单一入口 + 智能路由
┌───────────────────────────────────────┐
│         Ingress Controller            │
│    (一个 LoadBalancer 或 NodePort)    │
└───────────┬───────────────────────────┘
            │ 根据域名/路径路由
    ┌───────┴───────┬──────────┐
    ▼               ▼          ▼
Service A       Service B   Service C
(ClusterIP)     (ClusterIP) (ClusterIP)
```

---

## 🏗️ Ingress 架构组成

### 核心组件

```
┌─────────────────────────────────────────────┐
│              Ingress 生态系统                │
├─────────────────────────────────────────────┤
│  1. Ingress Resource (资源对象)             │
│     └─ 定义路由规则(YAML)                   │
│                                              │
│  2. Ingress Controller (控制器)             │
│     └─ 读取 Ingress,配置负载均衡器          │
│                                              │
│  3. 负载均衡器 (Nginx/Traefik/HAProxy)      │
│     └─ 实际处理流量的组件                   │
└─────────────────────────────────────────────┘
```

---

## 📋 Ingress Resource (资源定义)

### 基础示例

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: example-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  # 1. 基于域名路由
  rules:
  - host: example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-service
            port:
              number: 80
  
  # 2. TLS/HTTPS 配置
  tls:
  - hosts:
    - example.com
    secretName: example-tls
```

### 完整功能示例

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: advanced-ingress
  namespace: default
  annotations:
    # Nginx 特定配置
    nginx.ingress.kubernetes.io/rewrite-target: /$2
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    # 自定义响应头
    nginx.ingress.kubernetes.io/configuration-snippet: |
      add_header X-Custom-Header "Hello from Ingress";
spec:
  # IngressClass (指定使用哪个 Ingress Controller)
  ingressClassName: nginx
  
  # TLS 配置
  tls:
  - hosts:
    - app.example.com
    - api.example.com
    secretName: example-tls-secret
  
  # 路由规则
  rules:
  # 规则 1:app.example.com
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
  
  # 规则 2:api.example.com
  - host: api.example.com
    http:
      paths:
      # /v1/* 路由到 api-v1
      - path: /v1
        pathType: Prefix
        backend:
          service:
            name: api-v1-service
            port:
              number: 8080
      
      # /v2/* 路由到 api-v2
      - path: /v2
        pathType: Prefix
        backend:
          service:
            name: api-v2-service
            port:
              number: 8080
  
  # 规则 3:默认后端(可选)
  defaultBackend:
    service:
      name: default-backend
      port:
        number: 80
```

---

## 🎛️ PathType (路径匹配类型)

### 三种匹配类型

| PathType | 匹配规则 | 示例 |
|----------|---------|------|
| **Prefix** | 前缀匹配 | `/foo` 匹配 `/foo`, `/foo/`, `/foo/bar` |
| **Exact** | 精确匹配 | `/foo` 只匹配 `/foo`,不匹配 `/foo/` |
| **ImplementationSpecific** | 由 Ingress Controller 决定 | 取决于实现 |

### 示例对比

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: path-types-demo
spec:
  rules:
  - host: example.com
    http:
      paths:
      # Prefix 匹配
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 8080
      # 匹配:
      # ✅ /api
      # ✅ /api/
      # ✅ /api/users
      # ✅ /api/v1/users
      
      # Exact 匹配
      - path: /login
        pathType: Exact
        backend:
          service:
            name: auth-service
            port:
              number: 80
      # 匹配:
      # ✅ /login
      # ❌ /login/
      # ❌ /login/oauth
```

---

## 🚀 Ingress Controller (控制器)

### 常见 Ingress Controller

| Controller | 特点 | 适用场景 |
|-----------|------|---------|
| **Nginx Ingress** | 最流行,功能强大 | 通用场景,生产推荐 |
| **Traefik** | 云原生,动态配置 | 微服务,自动服务发现 |
| **HAProxy** | 高性能,企业级 | 大流量,高并发 |
| **Kong** | API 网关功能 | API 管理,插件生态 |
| **Istio Gateway** | 服务网格集成 | 复杂微服务架构 |
| **AWS ALB** | 云原生(AWS) | AWS 环境 |
| **GCE** | 云原生(GCP) | GCP 环境 |

---

## 🔧 Ingress Controller 工作原理

### 核心流程

```
┌─────────────────────────────────────────────┐
│  1. 用户创建/更新 Ingress Resource          │
│     kubectl apply -f ingress.yaml           │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│  2. Ingress Controller 监听 API Server      │
│     - Watch Ingress 对象                    │
│     - Watch Service 对象                    │
│     - Watch Endpoints 对象                  │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│  3. 生成配置文件                             │
│     Nginx:  /etc/nginx/nginx.conf          │
│     Traefik: 动态配置                       │
│     HAProxy: /etc/haproxy/haproxy.cfg      │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│  4. 重载/更新负载均衡器                      │
│     nginx -s reload                         │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│  5. 流量路由生效                             │
│     客户端请求 → Ingress → Service → Pod    │
└─────────────────────────────────────────────┘
```

---

## 📦 部署 Nginx Ingress Controller

### 方式 1:使用官方 Helm Chart (推荐)

```bash
# 添加 Helm 仓库
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# 安装
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=LoadBalancer

# 查看部署状态
kubectl get pods -n ingress-nginx
kubectl get svc -n ingress-nginx
```

### 方式 2:使用 YAML 部署

```bash
# 下载官方 YAML
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml

# 查看部署
kubectl get all -n ingress-nginx
```

### 核心组件

```yaml
# 1. Deployment - Ingress Controller Pod
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ingress-nginx-controller
  namespace: ingress-nginx
spec:
  replicas: 2  # 高可用建议 2+
  selector:
    matchLabels:
      app.kubernetes.io/name: ingress-nginx
  template:
    metadata:
      labels:
        app.kubernetes.io/name: ingress-nginx
    spec:
      serviceAccountName: ingress-nginx
      containers:
      - name: controller
        image: registry.k8s.io/ingress-nginx/controller:v1.9.0
        args:
        - /nginx-ingress-controller
        - --election-id=ingress-nginx-leader
        - --controller-class=k8s.io/ingress-nginx
        - --configmap=$(POD_NAMESPACE)/ingress-nginx-controller
        ports:
        - name: http
          containerPort: 80
        - name: https
          containerPort: 443
        livenessProbe:
          httpGet:
            path: /healthz
            port: 10254
        readinessProbe:
          httpGet:
            path: /healthz
            port: 10254

---
# 2. Service - 暴露 Ingress Controller
apiVersion: v1
kind: Service
metadata:
  name: ingress-nginx-controller
  namespace: ingress-nginx
spec:
  type: LoadBalancer  # 或 NodePort
  ports:
  - name: http
    port: 80
    targetPort: 80
    protocol: TCP
  - name: https
    port: 443
    targetPort: 443
    protocol: TCP
  selector:
    app.kubernetes.io/name: ingress-nginx

---
# 3. ConfigMap - Nginx 全局配置
apiVersion: v1
kind: ConfigMap
metadata:
  name: ingress-nginx-controller
  namespace: ingress-nginx
data:
  # 自定义 Nginx 配置
  proxy-body-size: "100m"
  proxy-connect-timeout: "15"
  proxy-read-timeout: "600"
  proxy-send-timeout: "600"
  use-forwarded-headers: "true"
```

---

## 🌐 完整流量路径

### 请求流程详解

```
客户端
  │ 1. DNS 解析
  │    example.com → LoadBalancer IP (1.2.3.4)
  ▼
LoadBalancer / NodePort
  │ 2. 转发到 Ingress Controller Pod
  ▼
Ingress Controller (Nginx Pod)
  │ 3. 读取 Ingress 规则
  │    Host: example.com
  │    Path: /api/users
  │ 4. 匹配规则
  │    rule: host=example.com, path=/api
  │    backend: api-service:8080
  ▼
Service (api-service)
  │ 5. Service 选择器匹配 Pod
  │    selector: app=api
  │ 6. 查询 Endpoints
  │    endpoints: 10.244.1.5:8080, 10.244.2.8:8080
  │ 7. 负载均衡(默认轮询)
  ▼
Pod (api-xxxx)
  │ 8. 容器处理请求
  │    Container Port: 8080
  ▼
应用响应
  │ 9. 原路返回
  ▼
客户端收到响应
```

### 网络数据包追踪

```bash
# 客户端发起请求
curl -H "Host: example.com" http://1.2.3.4/api/users

# 1. DNS 解析
example.com → 1.2.3.4 (LoadBalancer External IP)

# 2. TCP 连接
Client:54321 → LoadBalancer:80

# 3. LoadBalancer 转发
LoadBalancer:80 → Ingress Controller Pod:80 (10.244.0.5:80)

# 4. Ingress Controller 内部处理
Nginx 读取配置:
  location /api {
    proxy_pass http://api-service.default.svc.cluster.local:8080;
  }

# 5. 查询 Service
kube-proxy/iptables 规则:
  api-service:8080 → Endpoints

# 6. 负载均衡到 Pod
10.244.0.5 → 10.244.1.5:8080 (Pod IP)

# 7. 响应返回
Pod → Ingress Controller → LoadBalancer → Client
```

---

## 🔒 HTTPS/TLS 配置

### 创建 TLS Secret

```bash
# 方式 1:使用自签名证书(测试环境)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout tls.key -out tls.crt \
  -subj "/CN=example.com"

kubectl create secret tls example-tls \
  --cert=tls.crt \
  --key=tls.key

# 方式 2:使用 Let's Encrypt (生产环境,推荐)
# 安装 cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# 创建 ClusterIssuer
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### 配置 HTTPS Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: https-ingress
  annotations:
    # 自动重定向 HTTP 到 HTTPS
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    # 使用 cert-manager 自动申请证书
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - example.com
    - www.example.com
    secretName: example-tls  # cert-manager 会自动创建这个 Secret
  rules:
  - host: example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-service
            port:
              number: 80
```

### 验证 HTTPS

```bash
# 检查证书
curl -v https://example.com

# 查看 Secret
kubectl get secret example-tls
kubectl describe secret example-tls

# 测试 HTTP 自动重定向
curl -I http://example.com
# HTTP/1.1 308 Permanent Redirect
# Location: https://example.com/
```

---

## 🎨 高级路由场景

### 场景 1:基于路径的路由

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: path-based-routing
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$2
spec:
  rules:
  - host: myapp.com
    http:
      paths:
      # /api/v1/* → api-v1-service
      - path: /api/v1(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: api-v1-service
            port:
              number: 8080
      
      # /api/v2/* → api-v2-service
      - path: /api/v2(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: api-v2-service
            port:
              number: 8080
      
      # /admin/* → admin-service
      - path: /admin
        pathType: Prefix
        backend:
          service:
            name: admin-service
            port:
              number: 3000
      
      # /* → frontend-service (默认)
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
```

### 场景 2:基于子域名的路由

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: subdomain-routing
spec:
  rules:
  # www.example.com
  - host: www.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: website-service
            port:
              number: 80
  
  # api.example.com
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 8080
  
  # blog.example.com
  - host: blog.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: blog-service
            port:
              number: 80
  
  # *.dev.example.com (通配符)
  - host: "*.dev.example.com"
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: dev-environment
            port:
              number: 80
```

### 场景 3:金丝雀发布 (Canary Deployment)

```yaml
# 主版本 Ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: production
spec:
  rules:
  - host: myapp.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-v1
            port:
              number: 80

---
# 金丝雀版本 Ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: canary
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    # 10% 流量到金丝雀版本
    nginx.ingress.kubernetes.io/canary-weight: "10"
    
    # 或基于请求头
    # nginx.ingress.kubernetes.io/canary-by-header: "X-Canary"
    # nginx.ingress.kubernetes.io/canary-by-header-value: "always"
    
    # 或基于 Cookie
    # nginx.ingress.kubernetes.io/canary-by-cookie: "canary"
spec:
  rules:
  - host: myapp.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-v2-canary
            port:
              number: 80
```

### 场景 4:A/B 测试

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ab-testing
  annotations:
    # 基于请求头进行 A/B 测试
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-by-header: "X-Version"
    nginx.ingress.kubernetes.io/canary-by-header-value: "beta"
spec:
  rules:
  - host: myapp.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-beta
            port:
              number: 80
```

```bash
# 普通用户访问 A 版本
curl http://myapp.com

# Beta 用户访问 B 版本
curl -H "X-Version: beta" http://myapp.com
```

---

## 🔧 常用 Annotations (Nginx)

### 基础配置

```yaml
metadata:
  annotations:
    # SSL 重定向
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    
    # 强制 HTTPS
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    
    # 后端协议
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"  # 或 HTTP, GRPC
    
    # 路径重写
    nginx.ingress.kubernetes.io/rewrite-target: /$2
    
    # URL 重写
    nginx.ingress.kubernetes.io/use-regex: "true"
```

### 高级配置

```yaml
metadata:
  annotations:
    # 上传文件大小限制
    nginx.ingress.kubernetes.io/proxy-body-size: "100m"
    
    # 超时配置
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "600"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
    
    # 会话保持 (Sticky Session)
    nginx.ingress.kubernetes.io/affinity: "cookie"
    nginx.ingress.kubernetes.io/session-cookie-name: "route"
    nginx.ingress.kubernetes.io/session-cookie-expires: "172800"
    nginx.ingress.kubernetes.io/session-cookie-max-age: "172800"
    
    # 限流
    nginx.ingress.kubernetes.io/limit-rps: "100"  # 每秒请求数
    nginx.ingress.kubernetes.io/limit-connections: "10"  # 并发连接数
    
    # CORS 配置
    nginx.ingress.kubernetes.io/enable-cors: "true"
    nginx.ingress.kubernetes.io/cors-allow-origin: "*"
    nginx.ingress.kubernetes.io/cors-allow-methods: "GET, POST, PUT, DELETE, OPTIONS"
    
    # 白名单
    nginx.ingress.kubernetes.io/whitelist-source-range: "10.0.0.0/8,192.168.0.0/16"
    
    # 基本认证
    nginx.ingress.kubernetes.io/auth-type: basic
    nginx.ingress.kubernetes.io/auth-secret: basic-auth
    nginx.ingress.kubernetes.io/auth-realm: "Authentication Required"
    
    # 自定义 Nginx 配置片段
    nginx.ingress.kubernetes.io/configuration-snippet: |
      more_set_headers "X-Custom-Header: MyValue";
      add_header X-Request-ID $request_id;
```

---

## 🛡️ 安全配置

### 1. 基本认证

```bash
# 创建密码文件
htpasswd -c auth admin
# 输入密码

# 创建 Secret
kubectl create secret generic basic-auth --from-file=auth

# 应用到 Ingress
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: secure-ingress
  annotations:
    nginx.ingress.kubernetes.io/auth-type: basic
    nginx.ingress.kubernetes.io/auth-secret: basic-auth
    nginx.ingress.kubernetes.io/auth-realm: "Authentication Required - Please enter your credentials"
spec:
  rules:
  - host: admin.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: admin-service
            port:
              number: 80
EOF
```

### 2. IP 白名单

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: whitelist-ingress
  annotations:
    # 只允许特定 IP 访问
    nginx.ingress.kubernetes.io/whitelist-source-range: "10.0.0.0/8,192.168.1.100/32"
spec:
  rules:
  - host: internal.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: internal-service
            port:
              number: 80
```

### 3. OAuth2 认证

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: oauth2-ingress
  annotations:
    nginx.ingress.kubernetes.io/auth-url: "https://oauth2-proxy.example.com/oauth2/auth"
    nginx.ingress.kubernetes.io/auth-signin: "https://oauth2-proxy.example.com/oauth2/start?rd=$escaped_request_uri"
spec:
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: protected-service
            port:
              number: 80
```

---

## 📊 监控和调试

### 查看 Ingress 状态

```bash
# 列出所有 Ingress
kubectl get ingress

# 详细信息
kubectl describe ingress example-ingress

# 查看 Ingress Controller 日志
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx -f

# 查看生成的 Nginx 配置
kubectl exec -n ingress-nginx <ingress-controller-pod> -- cat /etc/nginx/nginx.conf
```

### 测试 Ingress 规则

```bash
# 测试域名解析
nslookup example.com

# 测试 HTTP
curl -H "Host: example.com" http://<ingress-ip>/

# 测试 HTTPS
curl -k -H "Host: example.com" https://<ingress-ip>/

# 查看响应头
curl -I -H "Host: example.com" http://<ingress-ip>/

# 测试特定路径
curl -H "Host: example.com" http://<ingress-ip>/api/users
```

### 常见问题排查

```bash
# 1. 检查 Ingress 是否有 Address
kubectl get ingress
# 如果 ADDRESS 列为空,说明 Ingress Controller 未就绪

# 2. 检查 Service 和 Endpoints
kubectl get svc
kubectl get endpoints

# 3. 检查 Ingress Controller Pod
kubectl get pods -n ingress-nginx
kubectl logs -n ingress-nginx <pod-name>

# 4. 检查 DNS 解析
kubectl run -it --rm debug --image=busybox --restart=Never -- nslookup example.com

# 5. 检查网络连通性
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  curl -H "Host: example.com" http://web-service.default.svc.cluster.local
```

---

## 🎯 Ingress vs Service Type

### 对比表

| 维度 | Ingress | LoadBalancer | NodePort |
|------|---------|--------------|----------|
| **成本** | 1 个 LB | 每个服务 1 个 LB | 免费 |
| **域名路由** | ✅ 支持 | ❌ 不支持 | ❌ 不支持 |
| **路径路由** | ✅ 支持 | ❌ 不支持 | ❌ 不支持 |
| **TLS 终止** | ✅ 支持 | ⚠️ 需要额外配置 | ❌ 不支持 |
| **7 层功能** | ✅ 丰富 | ❌ 4 层 | ❌ 4 层 |
| **适用场景** | HTTP/HTTPS 服务 | 需要独立 LB 的服务 | 开发测试 |

---

## 💡 关键要点总结

### Ingress 的价值
1. **成本优化**:多个服务共享一个 LoadBalancer
2. **智能路由**:基于域名、路径的 7 层路由
3. **TLS 管理**:集中管理 HTTPS 证书
4. **高级功能**:限流、认证、重写、CORS 等
5. **易于管理**:声明式配置,统一入口

### 核心概念
- **Ingress Resource**:定义路由规则的 YAML
- **Ingress Controller**:读取规则并实现路由的控制器
- **负载均衡器**:实际处理流量的组件(Nginx/Traefik/HAProxy)

### 典型使用场景
- ✅ 微服务 API 网关
- ✅ 多租户应用(基于子域名隔离)
- ✅ 蓝绿部署/金丝雀发布
- ✅ Web 应用统一入口
- ❌ 非 HTTP 协议(如 TCP/UDP,考虑使用 Gateway API)

---

## 🚀 高级话题

### 1. IngressClass (多 Ingress Controller)

在同一集群中运行多个 Ingress Controller:

```yaml
# 定义 IngressClass
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  name: nginx
  annotations:
    ingressclass.kubernetes.io/is-default-class: "true"
spec:
  controller: k8s.io/ingress-nginx

---
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  name: traefik
spec:
  controller: traefik.io/ingress-controller

---
# 使用特定的 IngressClass
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-ingress
spec:
  ingressClassName: nginx  # 🔑 指定使用 nginx 控制器
  rules:
  - host: example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-service
            port:
              number: 80
```

**使用场景**:
- 内部服务使用 Nginx,外部服务使用 Traefik
- 不同团队使用不同的 Ingress Controller
- 按环境划分(dev 用 Traefik,prod 用 Nginx)

---

### 2. 默认后端 (Default Backend)

处理未匹配任何规则的请求:

```yaml
# 创建默认后端服务
apiVersion: v1
kind: Service
metadata:
  name: default-backend
spec:
  selector:
    app: default-backend
  ports:
  - port: 80
    targetPort: 8080

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: default-backend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: default-backend
  template:
    metadata:
      labels:
        app: default-backend
    spec:
      containers:
      - name: default-backend
        image: registry.k8s.io/defaultbackend-amd64:1.5
        ports:
        - containerPort: 8080

---
# 在 Ingress 中指定默认后端
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ingress-with-default
spec:
  defaultBackend:
    service:
      name: default-backend
      port:
        number: 80
  rules:
  - host: example.com
    http:
      paths:
      - path: /app
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 80
```

**效果**:
- 访问 `example.com/app` → app-service
- 访问 `example.com/other` → default-backend(404 页面)
- 访问 `unknown.com` → default-backend

---

### 3. ExternalName Service 与 Ingress

将 Ingress 路由到集群外部服务:

```yaml
# 创建 ExternalName Service
apiVersion: v1
kind: Service
metadata:
  name: external-api
spec:
  type: ExternalName
  externalName: api.external-service.com  # 外部域名

---
# Ingress 路由到外部服务
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: external-ingress
  annotations:
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
    nginx.ingress.kubernetes.io/upstream-vhost: "api.external-service.com"
spec:
  rules:
  - host: myapp.com
    http:
      paths:
      - path: /external
        pathType: Prefix
        backend:
          service:
            name: external-api
            port:
              number: 443
```

**使用场景**:
- 集成第三方 API
- 混合云架构(部分服务在云外)
- 灰度迁移(逐步从外部迁移到集群内)

---

### 4. 跨命名空间引用 (ExternalName 方式)

Ingress 默认只能引用同一命名空间的 Service,跨命名空间需要特殊处理:

```yaml
# Namespace: backend
apiVersion: v1
kind: Service
metadata:
  name: api-service
  namespace: backend
spec:
  selector:
    app: api
  ports:
  - port: 8080

---
# Namespace: frontend
# 创建 ExternalName Service 指向 backend 命名空间的服务
apiVersion: v1
kind: Service
metadata:
  name: api-proxy
  namespace: frontend
spec:
  type: ExternalName
  externalName: api-service.backend.svc.cluster.local
  ports:
  - port: 8080

---
# Ingress 在 frontend 命名空间
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: cross-ns-ingress
  namespace: frontend
spec:
  rules:
  - host: myapp.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: api-proxy  # 引用同命名空间的 ExternalName Service
            port:
              number: 8080
```

---

### 5. TCP/UDP 服务暴露

Ingress 原生只支持 HTTP/HTTPS,对于 TCP/UDP 需要特殊配置:

#### Nginx Ingress Controller 的 TCP 配置

```yaml
# ConfigMap 定义 TCP 服务
apiVersion: v1
kind: ConfigMap
metadata:
  name: tcp-services
  namespace: ingress-nginx
data:
  # 格式: "外部端口": "命名空间/服务名:服务端口"
  "3306": "default/mysql:3306"
  "6379": "default/redis:6379"
  "27017": "databases/mongodb:27017"

---
# 修改 Ingress Controller Service,暴露 TCP 端口
apiVersion: v1
kind: Service
metadata:
  name: ingress-nginx-controller
  namespace: ingress-nginx
spec:
  type: LoadBalancer
  ports:
  - name: http
    port: 80
    targetPort: 80
  - name: https
    port: 443
    targetPort: 443
  # 添加 TCP 端口
  - name: mysql
    port: 3306
    targetPort: 3306
  - name: redis
    port: 6379
    targetPort: 6379
  - name: mongodb
    port: 27017
    targetPort: 27017
  selector:
    app.kubernetes.io/name: ingress-nginx

---
# 修改 Ingress Controller Deployment,引用 ConfigMap
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ingress-nginx-controller
  namespace: ingress-nginx
spec:
  template:
    spec:
      containers:
      - name: controller
        args:
        - /nginx-ingress-controller
        - --tcp-services-configmap=$(POD_NAMESPACE)/tcp-services
        # ...其他参数
```

**访问方式**:
```bash
# 连接 MySQL
mysql -h <ingress-lb-ip> -P 3306 -u root -p

# 连接 Redis
redis-cli -h <ingress-lb-ip> -p 6379
```

---

### 6. 灰度发布策略详解

#### 基于权重的流量分配

```yaml
# 生产版本 (90% 流量)
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: production
spec:
  rules:
  - host: myapp.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-v1
            port:
              number: 80

---
# 灰度版本 (10% 流量)
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: canary
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "10"
spec:
  rules:
  - host: myapp.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-v2
            port:
              number: 80
```

#### 基于请求头的灰度

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: canary-header
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-by-header: "X-Canary"
    nginx.ingress.kubernetes.io/canary-by-header-value: "true"
spec:
  rules:
  - host: myapp.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-v2
            port:
              number: 80
```

**测试**:
```bash
# 普通用户访问 v1
curl http://myapp.com

# 带特殊请求头的用户访问 v2
curl -H "X-Canary: true" http://myapp.com
```

#### 基于 Cookie 的灰度

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: canary-cookie
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-by-cookie: "canary"
spec:
  rules:
  - host: myapp.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-v2
            port:
              number: 80
```

**使用**:
- Cookie `canary=always` → 路由到 v2
- Cookie `canary=never` → 路由到 v1
- 无 Cookie → 根据权重路由

---

### 7. 性能优化

#### Nginx Ingress Controller 优化配置

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ingress-nginx-controller
  namespace: ingress-nginx
data:
  # 工作进程数(建议等于 CPU 核心数)
  worker-processes: "auto"
  
  # 每个工作进程的连接数
  max-worker-connections: "65536"
  
  # 启用 HTTP/2
  use-http2: "true"
  
  # 启用 gzip 压缩
  use-gzip: "true"
  gzip-level: "6"
  gzip-types: "text/plain text/css application/json application/javascript text/xml application/xml"
  
  # 客户端请求体缓冲
  client-body-buffer-size: "128k"
  client-max-body-size: "100m"
  
  # Keepalive 连接
  keep-alive: "75"
  keep-alive-requests: "1000"
  
  # 代理缓冲
  proxy-buffer-size: "16k"
  proxy-buffers: "4 16k"
  
  # 日志优化(生产环境可以禁用访问日志)
  disable-access-log: "false"
  access-log-params: "buffer=16k flush=5s"
  
  # SSL 优化
  ssl-protocols: "TLSv1.2 TLSv1.3"
  ssl-ciphers: "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256"
  ssl-prefer-server-ciphers: "true"
  ssl-session-cache: "true"
  ssl-session-cache-size: "10m"
  ssl-session-timeout: "10m"
  
  # 启用连接复用
  upstream-keepalive-connections: "100"
  upstream-keepalive-timeout: "60"
  
  # 限制
  limit-req-status-code: "429"
  limit-conn-status-code: "429"
```

#### Ingress Controller Pod 资源配置

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ingress-nginx-controller
  namespace: ingress-nginx
spec:
  replicas: 3  # 高可用建议 3+
  template:
    spec:
      containers:
      - name: controller
        image: registry.k8s.io/ingress-nginx/controller:v1.9.0
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "2000m"
            memory: "2Gi"
        # 启用性能分析
        livenessProbe:
          httpGet:
            path: /healthz
            port: 10254
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /healthz
            port: 10254
          periodSeconds: 5
```

---

### 8. 监控和可观测性

#### Prometheus 监控集成

```yaml
# ServiceMonitor for Prometheus Operator
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: ingress-nginx
  namespace: ingress-nginx
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: ingress-nginx
  endpoints:
  - port: metrics
    interval: 30s
```

#### 查看 Ingress Controller 指标

```bash
# 访问 metrics 端点
kubectl port-forward -n ingress-nginx svc/ingress-nginx-controller-metrics 10254:10254

# 浏览器访问
http://localhost:10254/metrics

# 关键指标:
# - nginx_ingress_controller_requests: 请求总数
# - nginx_ingress_controller_request_duration_seconds: 请求延迟
# - nginx_ingress_controller_response_size: 响应大小
# - nginx_ingress_controller_ssl_expire_time_seconds: SSL 证书过期时间
```

#### Grafana 仪表盘

```bash
# 导入官方 Grafana 仪表盘
# Dashboard ID: 9614 (Nginx Ingress Controller)
# Dashboard ID: 11875 (Nginx Ingress Controller Request Handling Performance)
```

---

### 9. 故障排查清单

#### 问题 1: Ingress 没有分配 Address

```bash
# 检查
kubectl get ingress
# NAME       CLASS   HOSTS         ADDRESS   PORTS   AGE
# my-app     nginx   example.com             80      5m

# 原因:
# 1. Ingress Controller 未运行
kubectl get pods -n ingress-nginx

# 2. Service type 不是 LoadBalancer
kubectl get svc -n ingress-nginx

# 3. 云提供商未分配 LoadBalancer IP
kubectl describe svc -n ingress-nginx ingress-nginx-controller
```

#### 问题 2: 502 Bad Gateway

```bash
# 原因 1: 后端 Service 不存在
kubectl get svc

# 原因 2: 后端 Pod 不健康
kubectl get pods
kubectl describe pod <pod-name>

# 原因 3: 端口配置错误
kubectl get svc <service-name> -o yaml | grep -A 5 ports

# 原因 4: 网络策略阻止
kubectl get networkpolicies

# 查看日志
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx --tail=100
```

#### 问题 3: 503 Service Unavailable

```bash
# 原因: 没有健康的 Endpoints
kubectl get endpoints <service-name>

# 如果 ENDPOINTS 列为空:
# 1. 检查 Service selector 是否匹配 Pod labels
kubectl get svc <service-name> -o yaml | grep -A 3 selector
kubectl get pods --show-labels

# 2. 检查 Pod 是否 Ready
kubectl get pods

# 3. 检查容器端口是否正确
kubectl get pods <pod-name> -o yaml | grep -A 5 ports
```

#### 问题 4: TLS 证书问题

```bash
# 检查 Secret 是否存在
kubectl get secret <tls-secret-name>

# 查看证书内容
kubectl get secret <tls-secret-name> -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -text -noout

# 检查证书过期时间
kubectl get secret <tls-secret-name> -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -dates

# cert-manager 问题
kubectl get certificate
kubectl describe certificate <cert-name>
kubectl get certificaterequests
```

#### 问题 5: 路由规则不生效

```bash
# 1. 检查 Ingress 配置
kubectl describe ingress <ingress-name>

# 2. 查看生成的 Nginx 配置
kubectl exec -n ingress-nginx <controller-pod> -- cat /etc/nginx/nginx.conf | grep -A 20 "server_name example.com"

# 3. 测试域名解析
nslookup example.com

# 4. 使用 Host header 测试
curl -v -H "Host: example.com" http://<ingress-ip>/path

# 5. 检查 annotations 是否正确
kubectl get ingress <ingress-name> -o yaml | grep -A 10 annotations
```

---

### 10. 生产环境最佳实践

#### ✅ 高可用配置

```yaml
# 1. 多副本 Ingress Controller
spec:
  replicas: 3
  
  # 2. Pod 反亲和性(分散到不同节点)
  affinity:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchExpressions:
          - key: app.kubernetes.io/name
            operator: In
            values:
            - ingress-nginx
        topologyKey: kubernetes.io/hostname

  # 3. PodDisruptionBudget(确保至少 2 个副本运行)
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: ingress-nginx
  namespace: ingress-nginx
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app.kubernetes.io/name: ingress-nginx
```

#### ✅ 资源限制

```yaml
resources:
  requests:
    cpu: "500m"
    memory: "512Mi"
  limits:
    cpu: "2"
    memory: "2Gi"

# HPA 自动扩缩容
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ingress-nginx
  namespace: ingress-nginx
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ingress-nginx-controller
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

#### ✅ 安全加固

```yaml
# 1. 只暴露必要端口
# 2. 启用 TLS 1.2+
# 3. 配置安全头
metadata:
  annotations:
    nginx.ingress.kubernetes.io/configuration-snippet: |
      more_set_headers "X-Frame-Options: DENY";
      more_set_headers "X-Content-Type-Options: nosniff";
      more_set_headers "X-XSS-Protection: 1; mode=block";
      more_set_headers "Strict-Transport-Security: max-age=31536000; includeSubDomains";

# 4. 配置 WAF(Web Application Firewall)
nginx.ingress.kubernetes.io/enable-modsecurity: "true"
nginx.ingress.kubernetes.io/enable-owasp-core-rules: "true"

# 5. 限流保护
nginx.ingress.kubernetes.io/limit-rps: "100"
nginx.ingress.kubernetes.io/limit-burst-multiplier: "5"
```

#### ✅ 监控告警

```yaml
# Prometheus 告警规则示例
groups:
- name: ingress
  rules:
  - alert: IngressControllerDown
    expr: up{job="ingress-nginx-controller-metrics"} == 0
    for: 5m
    annotations:
      summary: "Ingress Controller is down"
  
  - alert: HighErrorRate
    expr: rate(nginx_ingress_controller_requests{status=~"5.."}[5m]) > 0.05
    for: 5m
    annotations:
      summary: "High 5xx error rate"
  
  - alert: HighLatency
    expr: histogram_quantile(0.95, nginx_ingress_controller_request_duration_seconds_bucket) > 1
    for: 10m
    annotations:
      summary: "High request latency (p95 > 1s)"
```

---

## 📚 总结对比:Ingress vs 其他方案

### Ingress vs LoadBalancer Service

```
场景:部署 10 个微服务

方案 A:每个服务一个 LoadBalancer
- 成本:10 个 LoadBalancer × $20/月 = $200/月
- 管理:10 个独立的 IP 地址
- 路由:无智能路由
- TLS:每个服务单独配置

方案 B:一个 Ingress
- 成本:1 个 LoadBalancer × $20/月 = $20/月 ✅
- 管理:1 个 IP 地址 ✅
- 路由:基于域名/路径智能路由 ✅
- TLS:集中管理证书 ✅
```

### Ingress vs API Gateway

| 功能 | Ingress | API Gateway (Kong/Tyk) |
|------|---------|----------------------|
| 基础路由 | ✅ | ✅ |
| 认证鉴权 | ⚠️ 基础 | ✅ 完善 |
| 限流熔断 | ⚠️ 基础 | ✅ 高级 |
| 插件生态 | ❌ 有限 | ✅ 丰富 |
| 学习曲线 | ✅ 简单 | ⚠️ 复杂 |
| 性能 | ✅ 高 | ⚠️ 中等 |

---

## 🎓 学习路径建议

1. **入门** (1-2 周)
   - 理解 Ingress 概念
   - 部署 Nginx Ingress Controller
   - 创建基本的 Ingress 规则
   - 配置 HTTP/HTTPS 访问

2. **进阶** (2-4 周)
   - 掌握各种路由策略
   - TLS 证书管理(cert-manager)
   - 金丝雀发布
   - 性能调优

3. **高级** (1-2 月)
   - 多 Ingress Controller 管理
   - WAF 和安全加固
   - 监控和告警
   - 故障排查

4. **专家** (持续学习)
   - 源码阅读
   - 自定义插件开发
   - Gateway API 迁移

需要我详细展开某个特定主题,比如 cert-manager 自动化证书管理、Ingress Controller 源码分析,或者 Gateway API 新标准吗? 🚀