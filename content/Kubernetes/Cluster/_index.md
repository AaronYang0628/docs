+++
tags = ["Template"]
title = 'Prepare k8s Cluster'
date = 2025-03-07T15:00:59+08:00
weight = 1
+++

Building a K8s Cluster, you can choose one of the following methods.
{{%children depth="999" description="false" showhidden="true" %}}


### Install Kuberctl

{{% include file="Content\Installation\Binary\kubectl.md" %}}

### Build Cluster

{{< tabs title="Install By" icon="thumbtack"  groupid="install" >}}
{{% tab title="kind" %}}
{{< tabs >}}
    {{% tab title="content" %}}
    {{% include file="/Kubernetes/Cluster/kind.md" %}}
    {{% /tab %}}
{{< /tabs >}}
{{% /tab %}}


{{% tab title="minikube✅" %}}
{{< tabs >}}
    {{% tab title="content" %}}
    {{% include file="/Kubernetes/Cluster/minikube.md" %}}
    {{% /tab %}}
{{< /tabs >}}
{{% /tab %}}

{{% tab title="k3s✅" %}}
{{< tabs >}}
    {{% tab title="content" %}}
    {{% include file="Content\Kubernetes\Cluster\k3s.md" %}}
    {{% /tab %}}
{{< /tabs >}}
{{% /tab %}}

{{% tab title="normal" %}}
#### Prerequisites
- Hardware Requirements:

    1. At least 2 GB of RAM per machine (minimum 1 GB)
    2. 2 CPUs on the master node
    3. Full network connectivity among all machines (public or private network)

- Operating System:
    1. Ubuntu 20.04/18.04, CentOS 7/8, or any other supported Linux distribution.

- Network Requirements:
    1. Unique hostname, MAC address, and product_uuid for each node.
    2. Certain ports need to be open (e.g., 6443, 2379-2380, 10250, 10251, 10252, 10255, etc.)

- Disable Swap:

    ```shell
    sudo swapoff -a
    ```

#### Steps to Setup Kubernetes Cluster
1. Prepare Your Servers
Update the Package Index and Install Necessary Packages
On all your nodes (both master and worker):
```shell
sudo apt-get update
sudo apt-get install -y apt-transport-https ca-certificates curl
```

Add the Kubernetes APT Repository
```shell
curl -s https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key add -
cat <<EOF | sudo tee /etc/apt/sources.list.d/kubernetes.list
deb http://apt.kubernetes.io/ kubernetes-xenial main
EOF
```

Install kubeadm, kubelet, and kubectl
```shell
sudo apt-get update
sudo apt-get install -y kubelet kubeadm kubectl
sudo apt-mark hold kubelet kubeadm kubectl
```

2. Initialize the Master Node
On the master node, initialize the Kubernetes control plane:

```shell
sudo kubeadm init --pod-network-cidr=192.168.0.0/16
```
The --pod-network-cidr flag is used to set the Pod network range. You might need to adjust this based on your network provider 

Set up Local kubeconfig
```shell
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

3. Install a Pod Network Add-on
You can install a network add-on like Flannel, Calico, or Weave. For example, to install Calico:

{{< tabs groupid="network" >}}
{{< tab title="flannel" >}}
```shell
kubectl apply -f https://github.com/coreos/flannel/raw/master/Documentation/kube-flannel.yml
```
{{< /tab >}}

{{< tab title="calico" >}}
```shell
kubectl apply -f https://docs.projectcalico.org/v3.14/manifests/calico.yaml
```
{{< /tab >}}
{{< /tabs>}}


4. Join Worker Nodes to the Cluster
On each worker node, run the kubeadm join command provided at the end of the kubeadm init output on the master node. It will look something like this:

```shell
sudo kubeadm join <master-ip>:6443 --token <token> --discovery-token-ca-cert-hash sha256:<hash>
```

If you lost the join command, you can create a new token on the master node:

```shell
sudo kubeadm token create --print-join-command
```

5. Verify the Cluster
Once all nodes have joined, you can verify the cluster status from the master node:

```shell
kubectl get nodes
```
This command should list all your nodes with the status "Ready".
{{% /tab %}}
{{< /tabs >}}