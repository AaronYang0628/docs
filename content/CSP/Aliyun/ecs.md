+++
title = 'ECS DNS'
date = 2024-03-14T15:00:59+08:00
+++

### ZJADC (Aliyun Directed Cloud)
Append content in `/etc/resolv.conf` 
```text
options timeout:2 attempts:3 rotate
nameserver 10.255.9.2
nameserver 10.200.12.5
```
And then you probably need to modify `yum.repo.d` as well, check [link](articles/cheatsheet/aliyun/mirrors/index.html)

---
### YQGCY (Aliyun Directed Cloud)
Append content in `/etc/resolv.conf` 
```text
nameserver 172.27.205.79
```
And then restart `kube-system`.`coredns-xxxx`

---
### Google DNS
```text
nameserver 8.8.8.8
nameserver 4.4.4.4
nameserver 223.5.5.5
nameserver 223.6.6.6
```


### Restart DNS
{{< tabs title="OS:" >}}
{{% tab title="Centos/Anolis" %}}
```shell
vim /etc/NetworkManager/NetworkManager.conf
```
{{% /tab %}}
{{% tab title="Debian" %}}
```shell
vim /etc/NetworkManager/NetworkManager.conf
```
{{% /tab %}}
{{% tab title="Ubuntu" %}}
```shell
sudo systemctl is-active systemd-resolved
sudo resolvectl flush-caches
# or sudo systemd-resolve --flush-caches
```
{{% /tab %}}
{{< /tabs >}}


add `"dns=none"` under `'[main]'` part
```shell
systemctl restart NetworkManager
```


### Modify `ifcfg-ethX` [Optional]
if you cannot get ipv4 address, you can try to modify `ifcfg-ethX`
```shell
vim /etc/sysconfig/network-scripts/ifcfg-ens33
```
set `ONBOOT=yes`

