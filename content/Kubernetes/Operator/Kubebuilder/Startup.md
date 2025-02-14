+++
title = 'Quick Start'
date = 2024-03-07T15:00:59+08:00
weight = 1
+++

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
// import ( "fmt" )
func (r *GuestbookReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	_ = log.FromContext(ctx)

	// TODO(user): your logic here
	fmt.Printf("I am a controller ->>>>>>")
	fmt.Printf("Name: %s, Namespace: %s", req.Name, req.Namespace)

	return ctrl.Result{}, nil
}
```

The struct `GuestbookSpec` we modified before, will 
And you can use `make run` to test your controller.
```shell
make run
```
and use following command to send a request
```shell
kubectl apply -k config/samples/
```

your controller terminal should be look like this
```text
I am a controller ->>>>>>Name: guestbook-sample, Namespace: default
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