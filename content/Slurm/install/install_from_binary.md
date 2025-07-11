+++
title = 'Install From Binary'
date = 2024-08-07T15:00:59+08:00
weight = 2
+++
> [!IMPORTANT]
> 
>`(All Nodes)` means all type nodes should install this component.
>
>`(Manager Node)` means only the `manager` node should install this component.
>
>`(Login Node)` means only the `Auth` node should install this component.
>
>`(Cmp)` means only the `Compute` node should install this component.


> Typically, there are three nodes are required to run Slurm. 
> 
> 1 `Manage(Manager Node)`, 1 `Login Node` and N `Compute(Cmp)`. 
> 
> but you can choose to install all service in single node. [check](https://www.amaxchina.com/Support/TechDocument/Detail/548)

### Prequisites
1. change hostname `(All Nodes)` 
    ```shell 
    hostnamectl set-hostname (manager|auth|computeXX)
    ```
2. modify `/etc/hosts` `(All Nodes)`
    ```shell
    echo "192.aa.bb.cc (manager|auth|computeXX)" >> /etc/hosts
    ```
3. disable firewall, selinux, dnsmasq, swap `(All Nodes)`. more detail [here](../../Articles/CheatSheet/Linux/disable_service/index.html)
4. [NFS Server](../../Software/Storage/NFS/index.html) `(Manager Node)`. NFS is used as the default file system for the Slurm accounting database. 
5. [NFS Client] `(All Nodes)`. all node should mount the NFS share
{{% expand title="Install NFS Client" %}}
```shell
mount <$nfs_server>:/data /data -o proto=tcp -o nolock
```
{{%/expand%}}
1. [Munge](https://dun.github.io/munge/) `(All Nodes)`. The auth/munge plugin will be built if the MUNGE authentication development library is installed. MUNGE is used as the default authentication mechanism.
{{% expand title="Install Munge" %}}
All node need to have the `munge` user and group.

```shell
groupadd -g 1108 munge
useradd -m -c "Munge Uid 'N' Gid Emporium" -d /var/lib/munge -u 1108 -g munge -s /sbin/nologin munge
```

```shell
yum install epel-release -y
yum install munge munge-libs munge-devel -y
```
Create global secret key

```shell
/usr/sbin/create-munge-key -r
dd if=/dev/urandom bs=1 count=1024 > /etc/munge/munge.key
```

sync secret to the rest of nodes
```shell
scp -p /etc/munge/munge.key root@<$rest_node>:/etc/munge/
```
```shell
ssh root@<$rest_node> "chown munge: /etc/munge/munge.key && chmod 400 /etc/munge/munge.key"
ssh root@<$rest_node> "systemctl start munge && systemctl enable munge"
```

test munge if it works
```shell
munge -n | unmunge
```
{{% /expand %}}
1. [Database ]() `(Manager Node)`. MySQL support for accounting will be built if the MySQL or MariaDB development library is present. A currently supported version of MySQL or MariaDB should be used.
{{% expand title="Install MariaDB" %}}
install mariadb
```shell
yum -y install mariadb-server
systemctl start mariadb && systemctl enable mariadb
ROOT_PASS=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16) 
mysql -e "CREATE USER root IDENTIFIED BY '${ROOT_PASS}'"
```
login mysql
```sql
mysql -u root -p${ROOT_PASS}
create database slurm_acct_db;
create user slurm;
grant all on slurm_acct_db.* TO 'slurm'@'localhost' identified by '123456' with grant option;
flush privileges;
quit
```
{{% /expand %}}

### Install Slurm 

1. create `slurm` user `(All Nodes)`
    ```shell
    groupadd -g 1109 slurm
    useradd -m -c "slurm manager" -d /var/lib/slurm -u 1109 -g slurm -s /bin/bash slurm
    ```

{{< tabs title="Install Slurm from " >}}
{{% tab title="binary" %}}
Build RPM package

2. install depeendencies `(Manager Node)`
    ```shell
    yum -y install gcc gcc-c++ readline-devel perl-ExtUtils-MakeMaker pam-devel rpm-build mysql-devel python3
    ```
3. build rpm package `(Manager Node)`
    ```shell
    wget https://download.schedmd.com/slurm/slurm-24.05.2.tar.bz2 -O slurm-24.05.2.tar.bz2
    rpmbuild -ta --nodeps slurm-24.05.2.tar.bz2
    ```
   The rpm files will be installed under the `$(HOME)/rpmbuild` directory of the user building them.
4. send rpm to rest nodes  `(Manager Node)`
    ```shell
    ssh root@<$rest_node> "mkdir -p /root/rpmbuild/RPMS/"
    scp -p $(HOME)/rpmbuild/RPMS/x86_64 root@<$rest_node>:/root/rpmbuild/RPMS/x86_64
    ```
5. install rpm  `(Manager Node)`
    ```shell
    ssh root@<$rest_node> "yum localinstall /root/rpmbuild/RPMS/x86_64/slurm-*"
    ```
6. modify configuration file `(Manager Node)`
    ```shell
    cp /etc/slurm/cgroup.conf.example /etc/slurm/cgroup.conf
    cp /etc/slurm/slurm.conf.example /etc/slurm/slurm.conf
    cp /etc/slurm/slurmdbd.conf.example /etc/slurm/slurmdbd.conf
    chmod 600 /etc/slurm/slurmdbd.conf
    chown slurm: /etc/slurm/slurmdbd.conf
    ```
    `cgroup.conf` doesnt need to change.<br/>

    edit `/etc/slurm/slurm.conf`, you can use this [link](../config_file/slurm.md) as a reference <br/>

    edit `/etc/slurm/slurmdbd.conf`, you can use this [link](../config_file/slurmdbd.md) as a reference <br/>
{{% /tab %}}
{{% tab title="repo" %}}
Install yum repo directly

1. install slurm `(All Nodes)`
    ```shell
    yum -y slurm-wlm slurmdbd
    ```
2. modify configuration file `(All Nodes)`
    ```shell
    vim /etc/slurm-llnl/slurm.conf
    ```
    ```shell
    vim /etc/slurm-llnl/slurmdbd.conf
    ```
    `cgroup.conf` doesnt need to change.<br/>

    edit `/etc/slurm/slurm.conf`, you can use this [link](../config_file/slurm.md/) as a reference <br/>

    edit `/etc/slurm/slurmdbd.conf`, you can use this [link](../config_file/slurmdbd.md) as a reference <br/>
{{% /tab %}}
{{< /tabs >}}


2. send configuration  `(Manager Node)`
   ```shell
    scp -r /etc/slurm/*.conf  root@<$rest_node>:/etc/slurm/
    ssh rootroot@<$rest_node> "mkdir /var/spool/slurmd && chown slurm: /var/spool/slurmd"
    ssh rootroot@<$rest_node> "mkdir /var/log/slurm && chown slurm: /var/log/slurm"
    ssh rootroot@<$rest_node> "mkdir /var/spool/slurmctld && chown slurm: /var/spool/slurmctld"
   ```
3. start service `(Manager Node)`
    ```shell
    ssh rootroot@<$rest_node> "systemctl start slurmdbd && systemctl enable slurmdbd"
    ssh rootroot@<$rest_node> "systemctl start slurmctld && systemctl enable slurmctld"
    ```
4. start service `(All Nodes)`
    ```shell
    ssh rootroot@<$rest_node> "systemctl start slurmd && systemctl enable slurmd"
    ```

### Test
1. show cluster status
```shell
scontrol show config
```
```shell
sinfo
scontrol show partition
scontrol show node
```

2. submit job
```shell
srun -N2 hostname
scontrol show jobs
```
3. check job status
```shell
squeue -a
```



### Reference:
1. [https://slurm.schedmd.com/documentation.html](https://slurm.schedmd.com/documentation.html)
2. [https://wiki.fysik.dtu.dk/Niflheim_system/Slurm_installation/](https://wiki.fysik.dtu.dk/Niflheim_system/Slurm_installation/)
3. [https://github.com/Artlands/Install-Slurm](https://github.com/Artlands/Install-Slurm)