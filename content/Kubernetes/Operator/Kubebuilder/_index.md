+++
title = 'KubeBuilder'
date = 2024-03-07T15:00:59+08:00
weight = 1
+++

### Basic 
Kubebuilder 是一个使用 [CRDs](https://kubernetes.io/zh-cn/docs/concepts/extend-kubernetes/api-extension/custom-resources/) 构建 K8s API 的 SDK，主要是：

- 基于 [controller-runtime](https://github.com/kubernetes-sigs/controller-runtime) 以及 [client-go](https://github.com/kubernetes/client-go) 构建
- 提供一套可扩展的 API 框架，方便用户从零开始开发 [CRDs](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/) 和 [Controllers](https://kubernetes.io/docs/concepts/architecture/controller/) 和 Admission Webhooks 来扩展 K8s。
- 还提供脚手架工具初始化 CRDs 工程，自动生成 [boilerplate](https://github.com/kubernetes-sigs/kubebuilder/blob/master/docs/book/src/reference/boilerplate.md) 模板代码和配置；



### Architecture
![mvc](../../../images/content/kubernetes/kubebuilder_arch.png)

### Main.go
```go
import (
	_ "k8s.io/client-go/plugin/pkg/client/auth"

	ctrl "sigs.k8s.io/controller-runtime"
)
// nolint:gocyclo
func main() {
    ...

    mgr, err := ctrl.NewManager(ctrl.GetConfigOrDie(), ctrl.Options{}

    ...
    if err = (&controller.GuestbookReconciler{
        Client: mgr.GetClient(),
        Scheme: mgr.GetScheme(),
    }).SetupWithManager(mgr); err != nil {
        setupLog.Error(err, "unable to create controller", "controller", "Guestbook")
        os.Exit(1)
    }

    ...
    if os.Getenv("ENABLE_WEBHOOKS") != "false" {
        if err = webhookwebappv1.SetupGuestbookWebhookWithManager(mgr); err != nil {
            setupLog.Error(err, "unable to create webhook", "webhook", "Guestbook")
            os.Exit(1)
        }
    }
```

### Manager
Manager是核心组件，可以协调多个控制器、处理缓存、客户端、领导选举等，来自[https://github.com/kubernetes-sigs/controller-runtime/blob/v0.20.0/pkg/manager/manager.go](https://github.com/kubernetes-sigs/controller-runtime/blob/v0.20.0/pkg/manager/manager.go#L332-L335)
- [Client](https://github.com/kubernetes-sigs/controller-runtime/blob/main/pkg/client/interfaces.go#L164-L178) 承担了与 Kubernetes API Server 通信、操作资源对象、读写缓存等关键职责; 分为两类：
    - [Reader](https://github.com/kubernetes-sigs/controller-runtime/blob/main/pkg/client/client.go#L333-L352)：优先读Cache， 避免频繁访问 API Server, Get后放缓存
    - Writer: 支持写操作（Create、Update、Delete、Patch），直接与 API Server 交互。
    - [informers](https://github.com/kubernetes-sigs/controller-runtime/blob/main/pkg/cache/internal/informers.go) 是 client-go 提供的核心组件，用于监听（Watch）Kubernetes API Server 中特定资源类型（如 Pod、Deployment 或自定义 CRD）的变更事件（Create/Update/Delete）。
        * Client 依赖 Informer 机制自动同步缓存。当 API Server 中资源变更时，Informer 会定时更新本地缓存，确保后续读操作获取最新数据。
- [Cache](https://github.com/kubernetes-sigs/controller-runtime/blob/v0.20.0/pkg/cache/informer_cache.go)
    * Cache 通过 内置的client 的 ListWatcher机制 监听 API Server 的资源变更。
    * 事件被写入本地缓存（如 Indexer），避免频繁访问 API Server。
    * 缓存（Cache）的作用是减少对API Server的直接请求，同时保证控制器能够快速读取资源的最新状态。
- [Event](https://github.com/kubernetes-sigs/controller-runtime/blob/v0.20.0/pkg/event/event.go)
    > Kubernetes API Server 通过 HTTP 长连接 推送资源变更事件，client-go 的 Informer 负责监听这些消息。
    * Event：事件是Kubernetes API Server与Controller之间传递的信息，包含资源类型、资源名称、事件类型（ADDED、MODIFIED、DELETED）等信息，并转换成requets, check [link](https://github.com/kubernetes-sigs/controller-runtime/blob/main/pkg/handler/enqueue.go#L56-L59)
    * API Server → Manager的Informer → Cache → Controller的Watch → Predicate过滤 → WorkQueue →  Controller的Reconcile()方法


### Controller
It’s a controller’s job to ensure that, for any given object the actual state of the world matches the desired state in the object. Each controller focuses on one root Kind, but may interact with other Kinds.
```go
func (r *GuestbookReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    ...
}
func (r *GuestbookReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&webappv1.Guestbook{}).
		Named("guestbook").
		Complete(r)
}
```
If you wanna build your own controller, please check [https://github.com/kubernetes/community/blob/master/contributors/devel/sig-api-machinery/controllers.md](https://github.com/kubernetes/community/blob/master/contributors/devel/sig-api-machinery/controllers.md)

1. 每个Controller在初始化时会向Manager注册它关心的资源类型（例如通过Owns(&v1.Pod{})声明关注Pod资源）。

2. Manager根据Controller的注册信息，为相关资源创建对应的Informer和Watch, check [link](https://github.com/kubernetes-sigs/controller-runtime/blob/main/pkg/builder/controller.go#L180-L200)

3. 当资源变更事件发生时，Informer会将事件从缓存中取出，并通过Predicate（过滤器）判断是否需要触发协调逻辑。

4. 若事件通过过滤，Controller会将事件加入队列（WorkQueue），最终调用用户实现的Reconcile()函数进行处理, check [link](https://github.com/kubernetes-sigs/controller-runtime/blob/main/pkg/internal/controller/controller.go#L148-L218)

```go
func (c *Controller[request]) Start(ctx context.Context) error {

	c.ctx = ctx

	queue := c.NewQueue(c.Name, c.RateLimiter)

    c.Queue = &priorityQueueWrapper[request]{TypedRateLimitingInterface: queue}

	err := func() error {

            // start to sync event sources
            if err := c.startEventSources(ctx); err != nil {
                return err
            }

            for i := 0; i < c.MaxConcurrentReconciles; i++ {
                go func() {
                    for c.processNextWorkItem(ctx) {

                    }
                }()
            }
	}()

	c.LogConstructor(nil).Info("All workers finished")
}
```

```go
func (c *Controller[request]) processNextWorkItem(ctx context.Context) bool {
	obj, priority, shutdown := c.Queue.GetWithPriority()

	c.reconcileHandler(ctx, obj, priority)

}
```

### Webhook
Webhooks are a mechanism to intercept requests to the Kubernetes API server. They can be used to validate, mutate, or even proxy requests.
```go

func (d *GuestbookCustomDefaulter) Default(ctx context.Context, obj runtime.Object) error {}

func (v *GuestbookCustomValidator) ValidateCreate(ctx context.Context, obj runtime.Object) (admission.Warnings, error) {}

func (v *GuestbookCustomValidator) ValidateUpdate(ctx context.Context, oldObj, newObj runtime.Object) (admission.Warnings, error) {}

func (v *GuestbookCustomValidator) ValidateDelete(ctx context.Context, obj runtime.Object) (admission.Warnings, error) {}

func SetupGuestbookWebhookWithManager(mgr ctrl.Manager) error {
	return ctrl.NewWebhookManagedBy(mgr).For(&webappv1.Guestbook{}).
		WithValidator(&GuestbookCustomValidator{}).
		WithDefaulter(&GuestbookCustomDefaulter{}).
		Complete()
}
```

### Links
{{%children depth="999" description="false" showhidden="true" %}}