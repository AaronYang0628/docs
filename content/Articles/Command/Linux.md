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
```

### awk
```shell
awk [params] 'script' var=value file(s)
or
awk [params] -f scriptfile var=value file(s)
```