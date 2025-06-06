+++
tags = ["NFS"]
title = 'Install NFS'
date = 2025-03-07T15:00:59+08:00
weight = 1
+++


### Installation

{{< tabs groupid="nfs" style="primary" title="Install By" icon="thumbtack" >}}

{{< tab title="Helm" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  2. Helm has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>

  {{< tabs groupid="1111" >}}
    {{% tab title="1.get helm repo" %}}
  ```bash
  helm repo add ay-helm-mirror https://aaronyang0628.github.io/helm-chart-mirror/charts
  helm repo update
  ```
    {{% /tab %}}
  {{< /tabs >}}

  {{< tabs groupid="22222" >}}
    {{% tab title="2.install chart" %}}
  ```bash
  helm install ay-helm-mirror/kube-prometheus-stack --generate-name
  ```
    {{% /tab %}}
  {{< /tabs >}}

  {{< tabs groupid="tips" >}}
    {{% tab style="tip" %}}
  for more information, you can check 🔗[https://artifacthub.io/packages/helm/prometheus-community/prometheus](https://artifacthub.io/packages/helm/prometheus-community/prometheus)
    {{% /tab %}}
  {{< /tabs >}}

{{< /tab >}}

{{< tab title="ArgoCD" style="transparent">}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  2. argoCD has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  3. ingres has installed on argoCD, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>

  {{< tabs groupid="tips" >}}
    {{% tab style="important" %}}
  **cert-manager** has installed on argocd and the clusterissuer has a named `self-signed-ca-issuer`service, , if not check 🔗[link](argo/argo-cd/application/cert_manager/index.html)
    {{% /tab %}}
  {{< /tabs >}}


  {{< tabs groupid="1111" >}}
    {{% tab title="1.preare secret" %}}
  ```bash
  kubectl get namespaces monitor > /dev/null 2>&1 || kubectl create namespace monitor
    kubectl -n monitor create secret generic prometheus-stack-credentials \
    --from-literal=grafana-username=admin \
    --from-literal=grafana-password=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16)
  ```
    {{% /tab %}}
  {{< /tabs >}}

  {{< tabs groupid="2222" >}}
    {{% tab title="2.prepare `prometheus-stack.yaml`" %}}

    {{% /tab %}}
  {{< /tabs >}}


  {{< tabs groupid="3333" >}}
    {{% tab title="3.apply to k8s " %}}
  ```bash
    kubectl -n argocd apply -f prometheus-stack.yaml
  ```
    {{% /tab %}}
  {{< /tabs >}}



  {{< tabs groupid="4444" >}}
    {{% tab title="4.sync by argocd" %}}
  ```bash
    argocd app sync argocd/prometheus-stack
  ```
    {{% /tab %}}
  {{< /tabs >}}

  {{< tabs groupid="5555" >}}
    {{% tab title="5.extract clickhouse admin credentials " %}}
  ```bash
    kubectl -n monitor get secret prometheus-stack-credentials -o jsonpath='{.data.grafana-password}' | base64 -d
  ```
    {{% /tab %}}
  {{< /tabs >}}

  {{< tabs groupid="666666" >}}
    {{% tab title="6.check web dashboard" %}}
  ```bash
    > add `$K8S_MASTER_IP grafana.dev.tech` to **/etc/hosts**

    > add `$K8S_MASTER_IP prometheus.dev.tech` to **/etc/hosts**
  ```
    {{% /tab %}}
    
  {{< /tabs >}}
  prometheus-srver: <a href="https://prometheus.dev.tech:32443/" target="_blank">https://prometheus.dev.tech:32443/</a> </p></br>
  grafana-console: <a href="https://grafana.dev.tech:32443/" target="_blank">https://grafana.dev.tech:32443/</a> </p></br>


{{< /tab >}}


{{< tab title="Centos" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. centos yum repo source has updated, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  2.  

  {{< tabs groupid="111" >}}
    {{% tab title="1.install nfs util" %}}
  ```bash
  yum update -y
  yum install -y nfs-utils rpcbind
  ```
    {{% /tab %}}
  {{< /tabs >}}

  {{< tabs groupid="222" >}}
    {{% tab title="2.create share folder" %}}
  ```bash
  mkdir /data && chmod 755 /data
  ```
    {{% /tab %}}
  {{< /tabs >}}


  {{< tabs groupid="33333" >}}
    {{% tab title="3.edit `/etc/exports`" %}}
  ```bash
  /data *(rw,sync,insecure,no_root_squash,no_subtree_check)
  ```
    {{% /tab %}}
  {{< /tabs >}}
  

  {{< tabs groupid="4444" >}}
    {{% tab title="4.start nfs server" %}}
  ```bash
  systemctl enable rpcbind
  systemctl enable nfs-server
  systemctl start rpcbind
  systemctl start nfs-server
  ```
    {{% /tab %}}
  {{< /tabs >}}


  {{< tabs groupid="55555" >}}
    {{% tab title="5.test load on localhost" %}}
  ```bash
  showmount -e localhost

  #Assume Result:
  #Export list for localhost: </p></br>
  #/data *
  ```
    {{% /tab %}}
  {{< /tabs >}}

  {{< tabs groupid="666" >}}
    {{% tab title="6.test load on other ip" %}}
  ```bash
  showmount -e 192.168.aa.bb

  #Assume Result:
  #Export list for localhost: </p></br>
  #/data *
  ```
    {{% /tab %}}
  {{< /tabs >}}

  {{< tabs groupid="777" >}}
    {{% tab title="7.mount nfs disk" %}}
  ```bash
  mkdir -p $(pwd)/mnt/nfs
  sudo mount -v 192.168.aa.bb:/data $(pwd)/mnt/nfs  -o proto=tcp -o nolock
  ```
    {{% /tab %}}
  {{< /tabs >}}

  {{< tabs groupid="888" >}}
    {{% tab title="8.set nfs auto mount" %}}
  ```bash
  echo "192.168.aa.bb:/data /data nfs rw,auto,nofail,noatime,nolock,intr,tcp,actimeo=1800 0 0" >> /etc/fstab
  df -h
  ```
    {{% /tab %}}
  {{< /tabs >}}

{{< /tab >}}


{{< tab title="Fedora" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. fedora dnf repo source has updated, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  2.  

  {{< tabs groupid="111" >}}
    {{% tab title="1.install nfs util" %}}
  ```bash
  dnf update -y
  dnf install -y nfs-utils rpcbind
  ```
    {{% /tab %}}
  {{< /tabs >}}

  {{< tabs groupid="222" >}}
    {{% tab title="2.create share folder" %}}
  ```bash
  mkdir /data && chmod 755 /data
  ```
    {{% /tab %}}
  {{< /tabs >}}


  {{< tabs groupid="33333" >}}
    {{% tab title="3.edit `/etc/exports`" %}}
  ```bash
  /data *(rw,sync,insecure,no_root_squash,no_subtree_check)
  ```
    {{% /tab %}}
  {{< /tabs >}}
  

  {{< tabs groupid="4444" >}}
    {{% tab title="4.start nfs server" %}}
  ```bash
  systemctl enable rpcbind
  systemctl enable nfs-server
  systemctl start rpcbind
  systemctl start nfs-server
  ```
    {{% /tab %}}
  {{< /tabs >}}


  {{< tabs groupid="55555" >}}
    {{% tab title="5.test load on localhost" %}}
  ```bash
  showmount -e localhost

  #Assume Result:
  #Export list for localhost: </p></br>
  #/data *
  ```
    {{% /tab %}}
  {{< /tabs >}}

  {{< tabs groupid="666" >}}
    {{% tab title="6.test load on other ip" %}}
  ```bash
  showmount -e 192.168.aa.bb

  #Assume Result:
  #Export list for localhost: </p></br>
  #/data *
  ```
    {{% /tab %}}
  {{< /tabs >}}

  {{< tabs groupid="777" >}}
    {{% tab title="7.mount nfs disk" %}}
  ```bash
  mkdir -p $(pwd)/mnt/nfs
  sudo mount -v 192.168.aa.bb:/data $(pwd)/mnt/nfs  -o proto=tcp -o nolock
  ```
    {{% /tab %}}
  {{< /tabs >}}

  {{< tabs groupid="888" >}}
    {{% tab title="8.set nfs auto mount" %}}
  ```bash
  echo "192.168.aa.bb:/data /data nfs rw,auto,nofail,noatime,nolock,intr,tcp,actimeo=1800 0 0" >> /etc/fstab
  df -h
  ```
    {{% /tab %}}
  {{< /tabs >}}

{{< /tab >}}


{{< tab title="Ubuntu" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. ubuntu apt repo source has updated, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  2.  

  {{< tabs groupid="111" >}}
    {{% tab title="1.install nfs util" %}}
  ```bash
  sudo apt update -y
  sudo apt-get install nfs-common
  ```
    {{% /tab %}}
  {{< /tabs >}}

  {{< tabs groupid="222" >}}
    {{% tab title="2.create share folder" %}}
  ```bash
  mkdir /data && chmod 755 /data
  ```
    {{% /tab %}}
  {{< /tabs >}}


  {{< tabs groupid="33333" >}}
    {{% tab title="3.edit `/etc/exports`" %}}
  ```bash
  /data *(rw,sync,insecure,no_root_squash,no_subtree_check)
  ```
    {{% /tab %}}
  {{< /tabs >}}
  

  {{< tabs groupid="4444" >}}
    {{% tab title="4.start nfs server" %}}
  ```bash
  systemctl enable rpcbind
  systemctl enable nfs-server
  systemctl start rpcbind
  systemctl start nfs-server
  ```
    {{% /tab %}}
  {{< /tabs >}}


  {{< tabs groupid="55555" >}}
    {{% tab title="5.test load on localhost" %}}
  ```bash
  showmount -e localhost

  #Assume Result:
  #Export list for localhost: </p></br>
  #/data *
  ```
    {{% /tab %}}
  {{< /tabs >}}

  {{< tabs groupid="666" >}}
    {{% tab title="6.test load on other ip" %}}
  ```bash
  showmount -e 192.168.aa.bb

  #Assume Result:
  #Export list for localhost: </p></br>
  #/data *
  ```
    {{% /tab %}}
  {{< /tabs >}}

  {{< tabs groupid="777" >}}
    {{% tab title="7.mount nfs disk" %}}
  ```bash
  mkdir -p $(pwd)/mnt/nfs
  sudo mount -v 192.168.aa.bb:/data $(pwd)/mnt/nfs  -o proto=tcp -o nolock
  ```
    {{% /tab %}}
  {{< /tabs >}}

  {{< tabs groupid="888" >}}
    {{% tab title="8.set nfs auto mount" %}}
  ```bash
  echo "192.168.aa.bb:/data /data nfs rw,auto,nofail,noatime,nolock,intr,tcp,actimeo=1800 0 0" >> /etc/fstab
  df -h
  ```
    {{% /tab %}}
  {{< /tabs >}}

{{< /tab >}}


{{< /tabs >}}



### FAQ

{{% expand title="Q1: Show me almost **endless** possibilities" %}}
You can add standard markdown syntax:

- multiple paragraphs
- bullet point lists
- _emphasized_, **bold** and even **_bold emphasized_** text
- [links](https://example.com)
- etc.

```plaintext
...and even source code
```

> the possibilities are endless (almost - including other shortcodes may or may not work)
{{% /expand %}}


{{% expand title="Q2: Show me almost **endless** possibilities" %}}
You can add standard markdown syntax:

- multiple paragraphs
- bullet point lists
- _emphasized_, **bold** and even **_bold emphasized_** text
- [links](https://example.com)
- etc.

```plaintext
...and even source code
```

> the possibilities are endless (almost - including other shortcodes may or may not work)
{{% /expand %}}