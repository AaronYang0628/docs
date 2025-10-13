+++
title = 'Devpod'
date = 2024-03-07T15:00:59+08:00
weight = 4
+++

### Preliminary
- Kubernetes has installed, if not check 🔗[link](kubernetes/cluster/index.html)
- Devpod has installed, if not check 🔗[link](https://devpod.sh/)


### 1. Get provider config
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
clusters.cluster.server -> ip set to `localhost`
users.user.client-certificate -> users.user.client-certificate-data
users.user.client-key -> users.user.client-key-data
```

the data you paste after each key should be `base64`

```shell
cat <$file_path> | base64
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
    client-certificate-data: xxxxxxxxxxxx
    client-key-data: xxxxxxxxxxxxxxxx


```

then we should forward minikube port [in your own pc]()
```shell
#where you host minikube
MACHINE_IP_ADDRESS=10.200.60.102
USER=ayay
MINIKUBE_IP_ADDRESS=$(ssh -o 'UserKnownHostsFile /dev/null' $USER@$MACHINE_IP_ADDRESS '$HOME/bin/minikube ip')
ssh -o 'UserKnownHostsFile /dev/null' $USER@$MACHINE_IP_ADDRESS -L "*:8443:$MINIKUBE_IP_ADDRESS:8443" -N -f
```

{{% /tab %}}
{{< /tabs >}}

### 2. Create workspace
1. get git repo link
2. choose appropriate provider
3. choose ide type and version
4. and go!

### Useful Command

  {{% notice style="important" title="Install Kubectl" %}} 
  for more information, you can check 🔗[link](/docs/Installation/binary/kubectl/index.html) to install kubectl
  {{% /notice %}}

- How to use it in devpod
{{< tabs groupid="devpod">}}
{{% tab title="ack" %}}

Everything works fine.

{{% /tab %}}
{{% tab title="minikube" %}}

when you in pod, and using **kubectl** you should change `clusters.cluster.server` in `~/.kube/config` to **https://<$minikube_ip>:8443**

{{% /tab %}}
{{< /tabs >}}


- exec into devpod
```shell
kubectl -n devpod exec -it <$resource_id> -c devpod -- bin/bash
```

- add DNS item
```text
10.aaa.bbb.ccc gitee.zhejianglab.com
```

- shutdown ssh tunnel
{{< tabs groupid="ssh">}}
{{% tab title="windows" %}}
```shell
# check if port 8443 is already open
netstat -aon|findstr "8443"

# find PID
ps | grep ssh

# kill the process
taskkill /PID <$PID> /T /F
```
{{% /tab %}}
{{% tab title="linux" %}}
```shell
# check if port 8443 is already open
netstat -aon|findstr "8443"

# find PID
ps | grep ssh

# kill the process
kill -9 <$PID>
```
{{% /tab %}}
{{< /tabs >}}