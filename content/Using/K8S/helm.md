+++
title = 'Helm Principle'
date = 2024-03-07T15:00:59+08:00
weight = 71
+++

Helm 是 Kubernetes 的包管理工具，类似于 Linux 的 apt/yum 或 Python 的 pip，它的核心作用是：
👉 **用模板化的方式定义、安装和升级 Kubernetes 应用。**

---

## 🧩 一、Helm 的核心概念

在理解原理前，先明确 Helm 的几个关键对象：

| 概念              | 说明                                                              |
| --------------- | --------------------------------------------------------------- |
| **Chart**       | 一个 Helm 包，描述一组 Kubernetes 资源的模板集合（即一个应用的安装包）                    |
| **Values.yaml** | Chart 的参数配置文件，用于填充模板变量                                          |
| **Release**     | Helm 将 Chart 安装到某个命名空间后的实例，每次安装或升级都是一个 release                  |
| **Repository**  | 存放打包后 chart (`.tgz`) 的仓库，可以是 HTTP/OCI 类型（如 Harbor, Artifactory） |

---

## ⚙️ 二、Helm 的工作原理流程

从用户角度来看，Helm Client 发出命令（如 `helm install`），Helm 会通过一系列步骤在集群中生成 Kubernetes 资源。

下面是核心流程图概念（文字版）：

```
       ┌────────────┐
       │ helm client│
       └─────┬──────┘
             │
             ▼
      1. 解析Chart与Values
             │
             ▼
      2. 模板渲染（Helm Template Engine）
             │
             ▼
      3. 生成纯YAML清单
             │
             ▼
      4. 调用Kubernetes API
             │
             ▼
      5. 创建/更新资源（Deployment、Service等）
             │
             ▼
      6. 记录Release历史（ConfigMap/Secret）
```

---

## 🔍 三、Helm 工作机制分解

### 1️⃣ Chart 渲染阶段

Helm 使用 Go 的 `text/template` 模板引擎 + Sprig 函数库，将模板与 `values.yaml` 合并生成 Kubernetes YAML 清单。

例如：

```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}-app
spec:
  replicas: {{ .Values.replicas }}
```

通过：

```bash
helm template myapp ./mychart -f myvalues.yaml
```

Helm 会本地生成纯 YAML 文件（不部署到集群）。

---

### 2️⃣ 部署阶段（Install/Upgrade）

执行：

```bash
helm install myapp ./mychart
```

Helm Client 会将渲染好的 YAML 通过 Kubernetes API 提交到集群（相当于执行 `kubectl apply`）。

Helm 同时在命名空间中创建一个 “Release 记录”，默认存放在：

```
namespace: <your-namespace>
kind: Secret
name: sh.helm.release.v1.<release-name>.vN
```

其中保存了：

* Chart 模板和 values 的快照
* 渲染后的 manifest
* Release 状态（deployed、failed 等）
* 版本号（v1, v2, ...）

---

### 3️⃣ 升级与回滚机制

当执行：

```bash
helm upgrade myapp ./mychart
```

时，Helm 会：

1. 读取旧版本 release secret
2. 渲染新模板
3. 比较新旧差异（Diff）
4. 调用 Kubernetes API 更新对象
5. 写入新的 release secret（版本号 +1）

回滚时：

```bash
helm rollback myapp 2
```

Helm 会取出 v2 的记录，再次 `kubectl apply`。

---

### 4️⃣ 仓库机制（Helm Repository / OCI Registry）

Helm 支持两种包分发方式：

* **HTTP 仓库**（传统）

  * 有一个 `index.yaml` 索引文件
  * Chart 以 `.tgz` 格式存储

* **OCI 仓库**（现代推荐）

  * Chart 存储在 OCI registry（如 Harbor, GHCR）
  * 推送方式：

    ```bash
    helm push mychart/ oci://harbor.example.com/helm
    ```
  * 拉取方式：

    ```bash
    helm pull oci://harbor.example.com/helm/mychart --version 1.0.0
    ```

---

## 🧠 四、Helm 与 Kubernetes 的关系

Helm 本身 **不直接管理容器运行**，它只是：

* 模板引擎 + 应用生命周期管理器；
* 所有资源最终仍由 Kubernetes 控制器（如 Deployment controller）调度、运行。

Helm 类似于 “上层应用打包器”：

```
Helm = Chart 模板系统 + Kubernetes API 客户端 + Release 历史追踪
```

---

## 💡 五、常见命令原理对照

| 命令               | Helm 行为                              |
| ---------------- | ------------------------------------ |
| `helm install`   | 渲染模板 → 提交资源 → 创建 release             |
| `helm upgrade`   | 渲染模板 → diff 旧版本 → 更新资源 → 新 release   |
| `helm rollback`  | 获取旧版本记录 → 重新提交旧 manifest             |
| `helm uninstall` | 删除 Kubernetes 资源 + 删除 release secret |
| `helm template`  | 本地渲染模板，不与集群交互                        |
| `helm diff`（插件）  | 比较新旧渲染结果差异                           |

---

## 🧩 六、Helm 3 与 Helm 2 的区别（核心）

| Helm 2                | Helm 3                   |
| --------------------- | ------------------------ |
| 需要 Tiller（集群内控制组件）    | 无需 Tiller，完全 client-side |
| 安全模型复杂（基于 RBAC 授权）    | 安全性更好，直接使用 kubeconfig 权限 |
| Release 存储在 ConfigMap | 默认存储在 Secret             |
| 需要 Helm Server 部署     | 纯客户端                     |

