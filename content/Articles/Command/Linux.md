+++
title = 'Linux'
date = 2024-03-12T11:16:18+08:00
weight = 2
+++

### useradd
```shell
sudo useradd <$name> -m -r -s /bin/bash -p <$password>
```
{{%expand title="add as soduer"%}}
```shell
echo '<$name> ALL=(ALL) NOPASSWD: ALL' >> /etc/sudoers
```
{{%/expand%}}


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
# awk [params] 'script' 
awk <$params> <$string_content>
```
{{%expand title="for example"%}}
filter bigger than 3
```shell
echo -e "1\n2\n3\n4\n5\n" | awk '$1>3'
```
![func1](../../../images/content/article/linux/awk.png)
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
ssh -o "UserKnownHostsFile /dev/null" \
    root@17.27.253.67 \
    "mkdir -p /root/.ssh && chmod 700 /root/.ssh && echo 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC00JLKF/Cd//rJcdIVGCX3ePo89KAgEccvJe4TEHs5pI5FSxs/7/JfQKZ+by2puC3IT88bo/d7nStw9PR3BXgqFXaBCknNBpSLWBIuvfBF+bcL+jGnQYo2kPjrO+2186C5zKGuPRi9sxLI5AkamGB39L5SGqwe5bbKq2x/8OjUP25AlTd99XsNjEY2uxNVClHysExVad/ZAcl0UVzG5xmllusXCsZVz9HlPExqB6K1sfMYWvLVgSCChx6nUfgg/NZrn/kQG26X0WdtXVM2aXpbAtBioML4rWidsByDb131NqYpJF7f+x3+I5pQ66Qpc72FW1G4mUiWWiGhF9tL8V9o1AY96Rqz0AVaxAQrBEuyCWKrXbA97HeC3Xp57Luvlv9TqUd8CIJYq+QTL0hlIDrzK9rJsg34FRAvf9sh8K2w/T/gC9UnRjRXgkPUgKldq35Y6Z9wP6KY45gCXka1PU4nVqb6wicO+RHcZ5E4sreUwqfTypt5nTOgW2/p8iFhdN8= Administrator@AARON-X1-8TH' \
    >> /root/.ssh/authorized_keys && chmod 600 /root/.ssh/authorized_keys"
```
{{%/expand%}}

### set -x
This will print each command to the standard error before executing it, which is useful for debugging scripts.
```shell
set -x
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


### fdisk
list all disk 
```shell
fdisk -l
```

### create CFS file system
Use mkfs.xfs command to create xfs file system and internal log on the same disk, example is shown below:
```shell
mkfs.xfs <$path>
```

### modprobe
program to add and remove modules from the Linux Kernel 
```shell
modprobe nfs && modprobe nfsd
```

### disown
```shell

```