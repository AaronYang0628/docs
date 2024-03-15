+++
title = 'Linux'
date = 2024-03-12T11:16:18+08:00
weight = 2
+++

### telnet
a command line interface for communication with a remote device or serve
```shell
telnet <$ip> <$port>
```

### lsof (list open files)

`-a` List processes that have open files

`-c` <process_name> List files opened by the specified process

`-g` List GID number process details

`-d` <file_number> List the processes occupying this file number

`-d` <directory> List open files in a directory

`-D` <directory> Recursively list open files in a directory

`-n` <directory> List files using NFS

`-i` <condition> List eligible processes. (protocol, :port, @ip)

`-p` <PID> List files opened by the specified process ID

`-u` List UID number process details

```shell
# lsof [params] 
lsof -i:30443 # find port 30443 
lsof -i -P -n # list all connections
```

### awk
```shell
# awk [params] 'script' var=value file(s)
awk [params] -f scriptfile var=value file(s)
```

### clean files 3 days ago
```shell
find /aaa/bbb/ccc/*.gz -mtime +3 -exec rm {} \;
```

### ssh without affect $HOME/.ssh/known_hosts
```shell
ssh -o "UserKnownHostsFile /dev/null" root@aaa.domain.com
ssh -o "UserKnownHostsFile /dev/null" -o "StrictHostKeyChecking=no" root@aaa.domain.com
```

### sync clock
```shell
[yum|dnf] install -y chrony \
    && systemctl enable chronyd \
    && (systemctl is-active chronyd || systemctl start chronyd) \
    && chronyc sources \
    && chronyc tracking \
    && timedatectl set-timezone 'Asia/Shanghai'
```

### set hostname
```shell
hostnamectl set-hostname develop
```

### add remote key
```shell
ssh -o "UserKnownHostsFile /dev/null" \
    root@aaa.bbb.ccc \
    "mkdir -p /root/.ssh && chmod 700 /root/.ssh && echo '$SOME_PUBLIC_KEY' \
    >> /root/.ssh/authorized_keys && chmod 600 /root/.ssh/authorized_keys"
```