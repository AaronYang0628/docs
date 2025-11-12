+++
title = 'JumpServer'
date = 2024-03-07T15:00:59+08:00
weight = 10
+++

```shell
          Local             Jumpserver        virtual node (develop/k3s)
        ________            _______                ________ 
       ╱        ╲          ╱       ╲╲             ╱        ╲
      ╱         ╱ ------  ╱        ╱╱  --------  ╱         ╱
     ╱         ╱         ╱         ╱            ╱         ╱ 
     ╲________╱          ╲________╱             ╲________╱  
    IP: 10.A.B.C    IP: jumpserver.ay.dev   IP: 192.168.100.xxx                                
```

### Modify SSH Config
> `30022` has ssh service at jumpserver
```shell
cat .ssh/config
Host jumpserver
  HostName jumpserver.ay.dev
  Port 30022
  User ay
  IdentityFile ~/.ssh/id_rsa

Host virtual
  HostName 192.168.100.xxx
  Port 22
  User ay
  ProxyJump jumpserver
  IdentityFile ~/.ssh/id_rsa
```
And then you can directly connect to the `virtual node`

### Forward port in virtual node
> `30022` has ssh service at jumpserver
> 
> `32524` is a service which you wanna forward
```shell
ssh -o 'UserKnownHostsFile /dev/null' -o 'ServerAliveInterval=60' -L 32524:192.168.100.xxx:32524 -p 30022 ay@jumpserver.ay.dev
```
