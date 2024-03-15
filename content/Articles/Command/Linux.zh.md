+++
title = 'Linux'
date = 2024-03-12T11:16:18+08:00
weight = 2
+++

### Telnet
a command line interface for communication with a remote device or serve
```shell
telnet <$ip> <$port>
```

### lsof (list open files)

`-a` 列出打开文件存在的进程

`-c` <进程名> 列出指定进程所打开的文件

`-g` 列出GID号进程详情

`-d` <文件号> 列出占用该文件号的进程

`+d` <目录> 列出目录下被打开的文件

`+D` <目录> 递归列出目录下被打开的文件

`-n` <目录> 列出使用NFS的文件

`-i` <条件> 列出符合条件的进程。（4、6、协议、:端口、 @ip ）

`-p` <进程号> 列出指定进程号所打开的文件

`-u` 列出UID号进程详情

`-h` 显示帮助信息

`-v` 显示版本信息

```shell
lsof -i:30443 # find port 30443 
```

