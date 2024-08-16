+++
title = 'Install From Binary'
date = 2024-08-07T15:00:59+08:00
weight = 2
+++

`(All)` means all nodes should install this component.

`(Mgr)` means only the MGR node should install this component.

### Prequisites
1. [Munge](https://dun.github.io/munge/) `(All)`. The auth/munge plugin will be built if the MUNGE authentication development library is installed. MUNGE is used as the default authentication mechanism.
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
1. [Database ]() `(Mgr)`. MySQL support for accounting will be built if the MySQL or MariaDB development library is present. A currently supported version of MySQL or MariaDB should be used.
{{% expand title="Install MariaDB" %}}
install mariadb
```shell
yum -y install mariadb-server
systemctl start mariadb && systemctl enable mariadb
```
login mysql
```shell
mysql
set password=PASSWORD('xxxxxxxxxxxxxx');
create database slurm_acct_db;
create user slurm;
grant all on slurm_acct_db.* TO 'slurm'@'localhost' identified by '123456' with grant option;
flush privileges;
quit
```
{{% /expand %}}
{{% expand title="Install Mysql [Optional]" %}}
asdadadasasda
{{% /expand %}}

### Install Slurm
{{< tabs title="Install Slurm from " >}}
    {{% tab title="binary" %}}
Build RPM package
1. create `slurm` user
    ```shell
    groupadd -g 1109 slurm
    useradd -m -c "slurm manager" -d /var/lib/slurm -u 1109 -g slurm -s /bin/bash slurm
    ```
2. install depeendencies
    ```shell
    yum -y install gcc gcc-c++ readline-devel perl-ExtUtils-MakeMaker pam-devel rpm-build mysql-devel python3
    ```
3. build rpm package
    ```shell
    wget https://download.schedmd.com/slurm/slurm-24.05.2.tar.bz2 -O slurm-24.05.2.tar.bz2
    rpmbuild -ta --nodeps slurm-24.05.2.tar.bz2
    ```
   The rpm files will be installed under the `$(HOME)/rpmbuild` directory of the user building them.
4. asdadasd
    {{% /tab %}}
{{% tab title="repo" %}}
```bash
echo "Hello World!"
```
{{% /tab %}}
{{% tab title="c" %}}
```c
printf"Hello World!");
```
{{% /tab %}}
{{< /tabs >}}

