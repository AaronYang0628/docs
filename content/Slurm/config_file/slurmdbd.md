+++
title = 'Slurmdbd Configuration File'
date = 2024-03-07T15:00:59+08:00
weight = 2
hidden = true
+++

```text
#
# slurmdbd.conf file.
#
# See the slurmdbd.conf man page for more information.
#
# Authentication info
AuthType=auth/munge     #认证方式，该处采用munge进行认证
AuthInfo=/var/run/munge/munge.socket.2     #为了与slurmctld控制节点通信的其它认证信息
#
# slurmDBD info
DbdAddr=localhost      #数据库节点名
DbdHost=localhost     #数据库IP地址
SlurmUser=slurm     #用户数据库操作的用户
DebugLevel=verbose     #调试信息级别，quiet：无调试信息；fatal：仅严重错误信息；error：仅错误信息； info：错误与通常信息；verbose：错误和详细信息；debug：错误、详细和调试信息；debug2：错误、详细和更多调试信息；debug3：错误、详细和甚至更多调试信息；debug4：错误、详细和甚至更多调试信息；debug5：错误、详细和甚至更多调试信息。debug数字越大，信息越详细
LogFile=/var/log/slurm/slurmdbd.log     #slurmdbd守护进程日志文件绝对路径 
PidFile=/var/run/slurmdbd.pid     #slurmdbd守护进程存储进程号文件绝对路径
#
# Database info
StorageType=accounting_storage/mysql     #数据存储类型
StoragePass=123456     #存储数据库密码
StorageUser=slurm     #存储数据库用户名
StorageLoc=slurm_acct_db     #数据库名称
```