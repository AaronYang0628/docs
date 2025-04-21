+++
title = 'Quick Start'
date = 2024-03-07T15:00:59+08:00
weight = 1
+++

### Prerequisites
- go version v1.23.0+
- docker version 17.03+.
- kubectl version v1.11.3+.
- Access to a Kubernetes v1.11.3+ cluster.

### Installation
```shell
# download kubebuilder and install locally.
curl -L -o kubebuilder "https://go.kubebuilder.io/dl/latest/$(go env GOOS)/$(go env GOARCH)"
chmod +x kubebuilder && sudo mv kubebuilder /usr/local/bin/
```

### Create A Project
```shell
mkdir -p ~/projects/guestbook
cd ~/projects/guestbook
kubebuilder init --domain my.domain --repo my.domain/guestbook
```
{{% expand title="Error: unable to scaffold with \"base.go.kubebuilder.io/v4\":exit status 1" %}}
**Just try again!**
```shell
rm -rf ~/projects/guestbook/*
kubebuilder init --domain my.domain --repo my.domain/guestbook
```
{{% /expand %}}

### Create An API
```shell
kubebuilder create api --group webapp --version v1 --kind Guestbook
```
{{% expand title="Error: unable to run post-scaffold tasks of \"base.go.kubebuilder.io/v4\": exec: \"make\": executable file not found in $PATH " %}}
```shell
apt-get -y install make
rm -rf ~/projects/guestbook/*
kubebuilder init --domain my.domain --repo my.domain/guestbook
kubebuilder create api --group webapp --version v1 --kind Guestbook
```
{{% /expand %}}


### Prepare a K8s Cluster

{{< tabs title="cluster in " >}}
{{% tab title="minikube" %}}
```shell
minikube start --kubernetes-version=v1.27.10 --image-mirror-country=cn --image-repository=registry.cn-hangzhou.aliyuncs.com/google_containers --cpus=4 --memory=4g --disk-size=50g --force
```

{{% /tab %}}

{{% tab title="kind" %}}

asdasda
{{% /tab %}}
{{< /tabs >}}


{{% expand title="Modify API [[Optional]]()" %}}
you can moidfy file `/~/projects/guestbook/api/v1/guestbook_types.go`

```go
type GuestbookSpec struct {
	// INSERT ADDITIONAL SPEC FIELDS - desired state of cluster
	// Important: Run "make" to regenerate code after modifying this file

	// Foo is an example field of Guestbook. Edit guestbook_types.go to remove/update
	Foo string `json:"foo,omitempty"`
}
```

which will corresponding to the file `/~/projects/guestbook/config/samples/webapp_v1_guestbook.yaml`

If you are editing the API definitions, generate the manifests such as Custom Resources (CRs) or Custom Resource Definitions (CRDs) using

```shell
make manifests
```
{{% /expand %}}


{{% expand title="Modify Controller [[Optional]]()" %}}
you can moidfy file `/~/projects/guestbook/internal/controller/guestbook_controller.go`
```go
// 	"fmt"
// "k8s.io/apimachinery/pkg/api/errors"
// "k8s.io/apimachinery/pkg/types"
// 	appsv1 "k8s.io/api/apps/v1"
//	corev1 "k8s.io/api/core/v1"
//	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
func (r *GuestbookReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	// The context is used to allow cancellation of requests, and potentially things like tracing. 
	_ = log.FromContext(ctx)

	fmt.Printf("I am a controller ->>>>>>")
	fmt.Printf("Name: %s, Namespace: %s", req.Name, req.Namespace)

	guestbook := &webappv1.Guestbook{}
	if err := r.Get(ctx, req.NamespacedName, guestbook); err != nil {
		return ctrl.Result{}, err
	}

	fooString := guestbook.Spec.Foo
	replicas := int32(1)
	fmt.Printf("Foo String: %s", fooString)

	// labels := map[string]string{
	// 	"app": req.Name,
	// }

	// dep := &appsv1.Deployment{
	// 	ObjectMeta: metav1.ObjectMeta{
	// 		Name:      fooString + "-deployment",
	// 		Namespace: req.Namespace,
	// 		Labels:    labels,
	// 	},
	// 	Spec: appsv1.DeploymentSpec{
	// 		Replicas: &replicas,
	// 		Selector: &metav1.LabelSelector{
	// 			MatchLabels: labels,
	// 		},
	// 		Template: corev1.PodTemplateSpec{
	// 			ObjectMeta: metav1.ObjectMeta{
	// 				Labels: labels,
	// 			},
	// 			Spec: corev1.PodSpec{
	// 				Containers: []corev1.Container{{
	// 					Name:  fooString,
	// 					Image: "busybox:latest",
	// 				}},
	// 			},
	// 		},
	// 	},
	// }

	// existingDep := &appsv1.Deployment{}
	// err := r.Get(ctx, types.NamespacedName{Name: dep.Name, Namespace: dep.Namespace}, existingDep)
	// if err != nil {
	// 	if errors.IsNotFound(err) {
	// 		if err := r.Create(ctx, dep); err != nil {
	// 			return ctrl.Result{}, err
	// 		}
	// 	} else {
	// 		return ctrl.Result{}, err
	// 	}
	// }

	return ctrl.Result{}, nil
}
```

And you can use `make run` to test your controller.
```shell
make run
```
and use following command to send a request
> make sure you install crds -> `make install` before you exec this following command 
```shell
make install
```
```shell
kubectl apply -k config/samples/
```

your controller terminal should be look like this
```text
I am a controller ->>>>>>Name: guestbook-sample, Namespace: defaultFoo String: foo-value
```
{{% /expand %}}

### Install CRDs
check installed crds in k8s
```shell
kubectl get crds
```

install `guestbook` crd in k8s
```shell
cd ~/projects/guestbook
make install
```

### uninstall CRDs
```shell
make uninstall

make undeploy
```

### Deploy to cluster
```shell
make docker-build IMG=aaron666/guestbook-operator:test
make docker-build docker-push IMG=<some-registry>/<project-name>:tag
```

```shell
make deploy IMG=<some-registry>/<project-name>:tag
```