+++
title = 'Devpod'
date = 2024-03-07T15:00:59+08:00
weight = 4
+++

### Preliminary
- Kubernetes has installed, if not check [link](kubernetes/command/install/index.html)
- Devpod has installed, if not check [link](https://devpod.sh/)


### Get provider config
{{< tabs groupid="devpod">}}
{{% tab title="ack" %}}
```text
# just copy ~/.kube/config
```
{{% /tab %}}
{{% tab title="minikube" %}}
for example, the original config
```yaml
apiVersion: v1
clusters:
- cluster:
    certificate-authority: <$file_path>
    extensions:
    - extension:
        provider: minikube.sigs.k8s.io
        version: v1.33.0
      name: cluster_info
    server: https://<$minikube_ip>:8443
  name: minikube
contexts:
- context:
    cluster: minikube
    extensions:
    - extension:
        provider: minikube.sigs.k8s.io
        version: v1.33.0
      name: context_info
    namespace: default
    user: minikube
  name: minikube
current-context: minikube
kind: Config
preferences: {}
users:
- name: minikube
  user:
    client-certificate: <$file_path>
    client-key: <$file_path>
```

you need to rename `clusters.cluster.certificate-authority`, `clusters.cluster.server`, `users.user.client-certificate`, `users.user.client-key`.

```text
clusters.cluster.certificate-authority -> clusters.cluster.certificate-authority-data
clusters.cluster.server -> clusters.cluster.server-data
users.user.client-certificate -> users.user.client-certificate-data
users.user.client-key -> users.user.client-key-data
```

the data you paste after each key should be `base64`

```shell
cat <$file_path> | base64
```

then we should forward minikube port [in your own pc]()
```shell
#where you host minikube
MACHINE_IP_ADDRESS=10.200.60.102
USER=ayay
MINIKUBE_IP_ADDRESS=$(ssh -o 'UserKnownHostsFile /dev/null' $USER@$MACHINE_IP_ADDRESS '$HOME/bin/minikube ip')
ssh -o 'UserKnownHostsFile /dev/null' $USER@$MACHINE_IP_ADDRESS -L "*:8443:$MINIKUBE_IP_ADDRESS:8443" -N -f
```

then, modified config file should be look like this:
```yaml
apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: xxxxxxxxxxxxxx
    extensions:
    - extension:
        provider: minikube.sigs.k8s.io
        version: v1.33.0
      name: cluster_info
    server: https://127.0.0.1:8443 
  name: minikube
contexts:
- context:
    cluster: minikube
    extensions:
    - extension:
        provider: minikube.sigs.k8s.io
        version: v1.33.0
      name: context_info
    namespace: default
    user: minikube
  name: minikube
current-context: minikube
kind: Config
preferences: {}
users:
- name: minikube
  user:
    client-certificate: xxxxxxxxxxxx
    client-key: xxxxxxxxxxxxxxxx

```

{{% /tab %}}
{{< /tabs >}}

### Create workspace
1. get git repo link
2. choose appropriate provider
3. choose ide type and version
4. and go!

### Useful Command
#### download [kubectl binary](kubernetes/command/install/index.html)
```shell
MIRROR="files.m.daocloud.io/"
VERSION=$(curl -L -s https://${MIRROR}dl.k8s.io/release/stable.txt)
[ $(uname -m) = x86_64 ] && curl -sSLo kubectl "https://${MIRROR}dl.k8s.io/release/${VERSION}/bin/linux/amd64/kubectl"
[ $(uname -m) = aarch64 ] && curl -sSLo kubectl "https://${MIRROR}dl.k8s.io/release/${VERSION}/bin/linux/arm64/kubectl"
chmod u+x kubectl
mkdir -p ${HOME}/bin
mv -f kubectl ${HOME}/bin
```
{{< tabs groupid="devpod">}}
{{% tab title="ack" %}}

Everything works fine.

{{% /tab %}}
{{% tab title="minikube" %}}

when you in pod, and using **kubectl** you should change `clusters.cluster.server` in `~/.kube/config` to **https://<$minikube_ip>:8443**

{{% /tab %}}
{{< /tabs >}}




#### download [argocd binary]()
```shell
MIRROR="files.m.daocloud.io/"
VERSION=v2.9.3
[ $(uname -m) = x86_64 ] && curl -sSLo argocd "https://${MIRROR}github.com/argoproj/argo-cd/releases/download/${VERSION}/argocd-linux-amd64"
[ $(uname -m) = aarch64 ] && curl -sSLo argocd "https://${MIRROR}github.com/argoproj/argo-cd/releases/download/${VERSION}/argocd-linux-arm64"
chmod u+x argocd
mkdir -p ${HOME}/bin
mv -f argocd ${HOME}/bin
```

#### exec into devpod
```shell
kubectl -n devpod exec -it <$resource_id> -c devpod -- bin/bash
```

#### add DNS item
```text
10.102.1.52 gitee.zhejianglab.com
```