+++
title = 'KubeVPN'
date = 2024-03-07T15:00:59+08:00
+++


## 1.install krew

- 1. download and install `krew`

{{% include file="Content\Installation\Binary\krew.md" %}}

- 2. Add the $HOME/.krew/bin directory to your PATH environment variable. 
```shell
export PATH="${KREW_ROOT:-$HOME/.krew}/bin:$PATH"
```

- 3. Run kubectl krew to check the installation
```shell
kubectl krew list
```

## 2. Download from kubevpn source from github
```shell
kubectl krew index add kubevpn https://gitclone.com/github.com/kubenetworks/kubevpn.git
kubectl krew install kubevpn/kubevpn
kubectl kubevpn 
```

## 3. Deploy VPN in some cluster
Using different config to access different cluster and deploy vpn in that k8s.
```shell
kubectl kubevpn connect
```
{{% expand title="If you wanna connect other k8s ..." %}}
```shell
kubectl kubevpn connect --kubeconfig /root/.kube/xxx_config
```
{{% /expand %}}

Your terminal should look like this:
{{< highlight type="text" wrap="true" hl_lines="1" >}}
➜  ~ kubectl kubevpn connect
Password:
Starting connect
Getting network CIDR from cluster info...
Getting network CIDR from CNI...
Getting network CIDR from services...
Labeling Namespace default
Creating ServiceAccount kubevpn-traffic-manager
Creating Roles kubevpn-traffic-manager
Creating RoleBinding kubevpn-traffic-manager
Creating Service kubevpn-traffic-manager
Creating MutatingWebhookConfiguration kubevpn-traffic-manager
Creating Deployment kubevpn-traffic-manager

Pod kubevpn-traffic-manager-66d969fd45-9zlbp is Pending
Container     Reason            Message
control-plane ContainerCreating
vpn           ContainerCreating
webhook       ContainerCreating

Pod kubevpn-traffic-manager-66d969fd45-9zlbp is Running
Container     Reason           Message
control-plane ContainerRunning
vpn           ContainerRunning
webhook       ContainerRunning

Forwarding port...
Connected tunnel
Adding route...
Configured DNS service
+----------------------------------------------------------+
| Now you can access resources in the kubernetes cluster ! |
+----------------------------------------------------------+
{{< /highlight >}}

already connected to cluster network, use command `kubectl kubevpn status` to check status

{{< highlight type="text" wrap="true" hl_lines="3" >}}
➜  ~ kubectl kubevpn status
ID Mode Cluster   Kubeconfig                  Namespace            Status      Netif
0  full ops-dev   /root/.kube/zverse_config   data-and-computing   Connected   utun0
{{< /highlight >}}

use pod `productpage-788df7ff7f-jpkcs` IP `172.29.2.134`

{{< highlight type="text" wrap="true" hl_lines="6" >}}
➜  ~ kubectl get pods -o wide
NAME                                       AGE     IP                NODE              NOMINATED NODE  GATES
authors-dbb57d856-mbgqk                    7d23h   172.29.2.132      192.168.0.5       <none>         
details-7d8b5f6bcf-hcl4t                   61d     172.29.0.77       192.168.104.255   <none>         
kubevpn-traffic-manager-66d969fd45-9zlbp   74s     172.29.2.136      192.168.0.5       <none>         
productpage-788df7ff7f-jpkcs               61d     172.29.2.134      192.168.0.5       <none>         
ratings-77b6cd4499-zvl6c                   61d     172.29.0.86       192.168.104.255   <none>         
reviews-85c88894d9-vgkxd                   24d     172.29.2.249      192.168.0.5       <none>         
{{< /highlight >}}

use `ping` to test connection, seems good

{{< highlight type="text" wrap="true" hl_lines="1" >}}
➜  ~ ping 172.29.2.134
PING 172.29.2.134 (172.29.2.134): 56 data bytes
64 bytes from 172.29.2.134: icmp_seq=0 ttl=63 time=55.727 ms
64 bytes from 172.29.2.134: icmp_seq=1 ttl=63 time=56.270 ms
64 bytes from 172.29.2.134: icmp_seq=2 ttl=63 time=55.228 ms
64 bytes from 172.29.2.134: icmp_seq=3 ttl=63 time=54.293 ms
^C
--- 172.29.2.134 ping statistics ---
4 packets transmitted, 4 packets received, 0.0% packet loss
round-trip min/avg/max/stddev = 54.293/55.380/56.270/0.728 ms
{{< /highlight >}}

use service `productpage` IP `172.21.10.49`

{{< highlight type="text" wrap="true" hl_lines="7" >}}
➜  ~ kubectl get services -o wide
NAME                      TYPE        CLUSTER-IP     PORT(S)              SELECTOR
authors                   ClusterIP   172.21.5.160   9080/TCP             app=authors
details                   ClusterIP   172.21.6.183   9080/TCP             app=details
kubernetes                ClusterIP   172.21.0.1     443/TCP              <none>
kubevpn-traffic-manager   ClusterIP   172.21.2.86    84xxxxxx0/TCP        app=kubevpn-traffic-manager
productpage               ClusterIP   172.21.10.49   9080/TCP             app=productpage
ratings                   ClusterIP   172.21.3.247   9080/TCP             app=ratings
reviews                   ClusterIP   172.21.8.24    9080/TCP             app=reviews
{{< /highlight >}}

use command `curl` to test service connection

{{< highlight type="text" wrap="true" hl_lines="1" >}}
➜  ~ curl 172.21.10.49:9080
<!DOCTYPE html>
<html>
  <head>
    <title>Simple Bookstore App</title>
<meta charset="utf-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="viewport" content="width=device-width, initial-scale=1">
{{< /highlight >}}

seems good too~

{{% expand title="if you wanna resolve domain" %}}

### Domain resolve

a Pod/Service named `productpage` in the `default` namespace can successfully resolve by following name:

- `productpage`
- `productpage.default`
- `productpage.default.svc.cluster.local`

```shell
➜  ~ curl productpage.default.svc.cluster.local:9080
<!DOCTYPE html>
<html>
  <head>
    <title>Simple Bookstore App</title>
<meta charset="utf-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="viewport" content="width=device-width, initial-scale=1">
```

### Short domain resolve

To access the service in the cluster, service name or you can use the short domain name, such
as `productpage`

```shell
➜  ~ curl productpage:9080
<!DOCTYPE html>
<html>
  <head>
    <title>Simple Bookstore App</title>
<meta charset="utf-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
...
```

***Disclaimer:*** This only works on the namespace where kubevpn-traffic-manager is deployed.

{{% /expand %}}