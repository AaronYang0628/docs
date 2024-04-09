+++
title = 'ECS'
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
```shell
vim /etc/NetworkManager/NetworkManager.conf
```

main 部分添加 `"dns=none"`
```shell
systemctl restart NetworkManager
```