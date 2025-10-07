+++
title = 'ECS'
date = 2024-03-14T15:00:59+08:00
+++

### Apsara Stack (Aliyun  Directed Cloud)
Append content in `/etc/resolv.conf` 
```text
nameserver 172.27.205.79
```
And then restart `kube-system`.`coredns-xxxx`