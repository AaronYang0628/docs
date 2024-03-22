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
{{%expand title="for example"%}}
```shell
telnet 172.27.253.50 9000 #test application connectivity
```
{{%/expand%}}

### lsof (list as open files)
everything is a file
```shell
lsof <$option:value>
```
{{%expand title="for example"%}}
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
lsof -i:30443 # find port 30443 
lsof -i -P -n # list all connections
```
{{%/expand%}}

### awk (Aho, Weinberger, and Kernighan [Names])
`awk` is a scripting language used for manipulating data and generating reports.
```shell
# awk [params] 'script' var=value file(s)
awk <$params> -f scriptfile var=value file(s)
```
{{%expand title="for example"%}}
```shell
```
{{%/expand%}}

### ss (socket statistics)
view detailed information about your system's network connections, including TCP/IP, UDP, and Unix domain sockets
```shell
# awk [params] 'script' var=value file(s)
awk <$params> -f scriptfile var=value file(s)
```
{{%expand title="for example"%}}
```shell
#show all listening TCP connection
ss -tln
```
```shell
#show all established TCP connections
ss -tan
```
{{%/expand%}}

### clean files 3 days ago
```shell
find /aaa/bbb/ccc/*.gz -mtime +3 -exec rm {} \;
```
{{%expand title="for example"%}}
```shell
```
{{%/expand%}}

### ssh without affect $HOME/.ssh/known_hosts
```shell
ssh -o "UserKnownHostsFile /dev/null" root@aaa.domain.com
ssh -o "UserKnownHostsFile /dev/null" -o "StrictHostKeyChecking=no" root@aaa.domain.com
```
{{%expand title="for example"%}}
```shell
```
{{%/expand%}}

### sync clock
```shell
[yum|dnf] install -y chrony \
    && systemctl enable chronyd \
    && (systemctl is-active chronyd || systemctl start chronyd) \
    && chronyc sources \
    && chronyc tracking \
    && timedatectl set-timezone 'Asia/Shanghai'
```
{{%expand title="for example"%}}
```shell
```
{{%/expand%}}

### set hostname
```shell
hostnamectl set-hostname develop
```
{{%expand title="for example"%}}
```shell
```
{{%/expand%}}

### add remote key
```shell
ssh -o "UserKnownHostsFile /dev/null" \
    root@aaa.bbb.ccc \
    "mkdir -p /root/.ssh && chmod 700 /root/.ssh && echo '$SOME_PUBLIC_KEY' \
    >> /root/.ssh/authorized_keys && chmod 600 /root/.ssh/authorized_keys"
```
{{%expand title="for example"%}}
```shell
```
{{%/expand%}}

### set -x
```shell

```

### sed (Stream Editor)
```shell
sed <$option> <$file_path>
```
{{%expand title="for example"%}}
replace `unix` -> `linux`
```shell
echo "linux is great os. unix is opensource. unix is free os." | sed 's/unix/linux/'
```
or you can check [https://www.geeksforgeeks.org/sed-command-in-linux-unix-with-examples/](https://www.geeksforgeeks.org/sed-command-in-linux-unix-with-examples/)
{{%/expand%}}