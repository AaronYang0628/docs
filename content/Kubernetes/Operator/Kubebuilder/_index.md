+++
title = 'KubeBuilder'
date = 2024-03-07T15:00:59+08:00
weight = 1
+++

### Basic 
Kubebuilder 是一个使用 CRDs 构建 K8s API 的 SDK，主要是：

- 提供一套可扩展的 API 框架，用于开发 CRDs 和 [Controllers](https://kubernetes.io/zh-cn/docs/concepts/architecture/controller/)；
- 提供脚手架工具初始化 CRDs 工程，自动生成 [boilerplate](https://github.com/kubernetes-sigs/kubebuilder/blob/master/docs/book/src/reference/boilerplate.md) 模板代码和配置；
- 基于 controller-runtime, client-go 构建

方便用户从零开始开发 CRDs，Controllers 和 Admission Webhooks 来扩展 K8s。

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
- [Client](https://github.com/kubernetes-sigs/controller-runtime/blob/v0.20.0/pkg/client/client.go#L82-L88)
    * 
- Cache
    * 缓存（Cache）的作用是减少对API Server的直接请求，同时保证控制器能够快速读取资源的最新状态。


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