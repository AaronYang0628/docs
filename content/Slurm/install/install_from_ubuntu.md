+++
title = 'Install On Ubuntu'
date = 2024-08-07T15:00:59+08:00
description = 'Install Slurm from Ubuntu'
weight = 1
+++

### Cluster Setting
- 1 Manager
- 1 Login Node
- 2 Compute nodes

|             **hostname**           |    **IP**      | **role**| **quota**|
| ---------------------------------- | -------------- | ------- | -------- |
| manage01 (**slurmctld, slurmdbd**) | 192.168.56.115 | manager | 2C4G     |
| login01 (**login**)                | 192.168.56.116 |  login  | 2C4G     |
| compute01 (**slurmd**)             | 192.168.56.117 | compute | 2C4G     |
| compute02 (**slurmd**)             | 192.168.56.118 | compute | 2C4G     |

Software Version:

| **software**       |     **version**    |
| ------------------ | ------------------ |
| os                 | Ubuntu 22.04       |
| slurm              |       24.05.2      |

---

> [!IMPORTANT]
> 
> when you see `(All Nodes)`, you need to run the following command on all nodes
> 
> when you see `(Manager Node)`, you only need to run the following command on manager node
>
> when you see `(Login Node)`, you only need to run the following command on login node


### Prepare Steps `(All Nodes)`

1. Modify the `/etc/apt/sources.list` file
Using tuna mirror
```bash
cat > /etc/apt/sources.list << EOF

EOF
```

{{% expand title="if you cannot get ipv4 address"%}}
Modify the `/etc/network/interfaces`
```text
allow-hotplug enps08
iface enps08 inet dhcp
```

restart the network
```bash
systemctl restart networking
```
{{% /expand %}}

2. Update apt cache
```bash
apt clean all && apt update
```

1. Set hosts file
```bash
cat >> /etc/hosts << EOF
10.119.2.36 juice-036
10.119.2.37 juice-037
10.119.2.38 juice-038
EOF
```

1. Install packages `ntpdate`
```bash
apt-get -y install ntpdate
```

1. Sync server time
```bash
ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
echo 'Asia/Shanghai' >/etc/timezone
ntpdate ntp.aliyun.com
```

1. Add cron job to sync time
```shell
crontab -e
*/5 * * * * /usr/sbin/ntpdate ntp.aliyun.com
```

1. Create ssh key pair on each node
```shell
ssh-keygen -t rsa -b 4096 -C $HOSTNAME
```

1.   Test ssh login other nodes without password 

{{< tabs groupid="main" style="primary" title="Node:" icon="thumbtack" >}}
{{< tab title = "manage01" >}}
  {{< tabs groupid="tabs-resource" >}}
  {{% tab title="bash" %}}
  ```bash
ssh-copy-id -i ~/.ssh/id_rsa.pub root@juice-036
ssh-copy-id -i ~/.ssh/id_rsa.pub root@juice-037
ssh-copy-id -i ~/.ssh/id_rsa.pub root@juice-038
  ```
  {{% /tab %}}
  {{< /tabs >}}
{{< /tab >}}

{{< /tabs >}}



### Install Components
> 1. Install NFS server `(Manager Node)`

there are many ways to install NFS server

- using `apt install -y nfs-kernel-server`, check https://www.linuxtechi.com/how-to-install-nfs-server-on-debian/

create shared folder
```PowerShell
mkdir /data
chmod 755 /data
```

**modify `vim /etc/exports`**
```bash
/data *(rw,sync,insecure,no_subtree_check,no_root_squash)
```

**start nfs server**

```Bash
systemctl start rpcbind 
systemctl start nfs-server 

systemctl enable rpcbind 
systemctl enable nfs-server
```

**check nfs server**

```PowerShell
showmount -e localhost

# Output
Export list for localhost:
/data *
```


> 2. Install munge service 
- add user munge `(All Nodes)`
```shell
sudo apt install -y build-essential git wget munge libmunge-dev libmunge2 \
    mariadb-server libmariadb-dev libssl-dev libpam0g-dev \
    libhwloc-dev liblua5.3-dev libreadline-dev libncurses-dev \
    libjson-c-dev libyaml-dev libhttp-parser-dev libjwt-dev libdbus-glib-1-dev libbpf-dev libdbus-1-dev


which mungekey

# 如果有，使用它生成 key
sudo systemctl stop munge
sudo mungekey -c
sudo chown munge:munge /etc/munge/munge.key
sudo chmod 400 /etc/munge/munge.key
sudo systemctl start munge
```


- copy `munge.key` from manager node to the rest node `(All Nodes)`
```shell
sudo scp /etc/munge/munge.key juice-036:/tmp/munge.key
sudo scp /etc/munge/munge.key juice-037:/tmp/munge.key
sudo scp /etc/munge/munge.key juice-038:/tmp/munge.key
```
- grant privilege on munge.key `(All Nodes)`
```shell
systemctl stop munge

sudo mv /tmp/munge.key /etc/munge/munge.key
chown munge: /etc/munge/munge.key
chmod 400 /etc/munge/munge.key

systemctl start munge
systemctl status munge
systemctl enable munge
```
Using `systemctl status munge` to check if the service is running

- test munge
```shell
munge -n | ssh juice-036 unmunge
munge -n | ssh juice-037 unmunge
munge -n | ssh juice-038 unmunge
```

> 3. Install Mariadb `(Manager Nodes)`
```shell
apt-get install -y mariadb-server
```

- create database and user
```bash
systemctl start mariadb
systemctl enable mariadb

ROOT_PASS=$(tr -dc A-Za-z0-9 </dev/urandom | head -c 16) 
mysql -e "CREATE USER root IDENTIFIED BY '${ROOT_PASS}'"
mysql -uroot -p$ROOT_PASS -e 'create database slurm_acct_db'
```

- create user `slurm`，and grant all privileges on database `slurm_acct_db`

```shell
mysql -uroot -p$ROOT_PASS
```
```sql
create user slurm;

grant all on slurm_acct_db.* TO 'slurm'@'localhost' identified by '123456' with grant option;

flush privileges;
```
- create Slurm user
```shell
groupadd -g 1109 slurm
useradd -m -c "Slurm manager" -d /var/lib/slurm -u 1109 -g slurm -s /bin/bash slurm
```

### Install Slurm `(All Nodes)`
- Install basic Debian package build requirements:
```shell
apt-get install -y build-essential fakeroot devscripts equivs
```
- Unpack the distributed tarball:
```shell
wget https://download.schedmd.com/slurm/slurm-25.05.2.tar.bz2 -O slurm-25.05.2.tar.bz2 &&
tar -xaf slurm*tar.bz2
```
- cd to the directory containing the Slurm source:
```shell
cd slurm-25.05.2 &&   mkdir -p /etc/slurm && ./configure --prefix=/usr --sysconfdir=/etc/slurm  --enable-cgroupv2
```
- compile slurm
```shell
make install
```

- modify configuration files `(Manager Nodes)`
  - modify `/etc/slurm/slurm.conf` Refer to [slurm.conf](./config_file/slurm.md)
  ```shell
  cp /root/slurm-25.05.2/etc/slurm.conf.example /etc/slurm/slurm.conf
  vim /etc/slurm/slurm.conf
  ```
  focus on these options:
  ```text
  SlurmctldHost=manage

  AccountingStorageEnforce=associations,limits,qos
  AccountingStorageHost=manage
  AccountingStoragePass=/var/run/munge/munge.socket.2
  AccountingStoragePort=6819  
  AccountingStorageType=accounting_storage/slurmdbd  

  JobCompHost=localhost
  JobCompLoc=slurm_acct_db
  JobCompPass=123456
  JobCompPort=3306
  JobCompType=jobcomp/mysql
  JobCompUser=slurm
  JobContainerType=job_container/none
  JobAcctGatherType=jobacct_gather/linux
  ```

  - modify `/etc/slurm/slurmdbd.conf` Refer to [slurmdbd.conf](./config_file/slurmdbd.md)
  ```shell
  cp /root/slurm-25.05.2/etc/slurmdbd.conf.example /etc/slurm/slurmdbd.conf
  vim /etc/slurm/slurmdbd.conf
  ```

  - modify `/etc/slurm/cgroup.conf`
  ```shell
  cp /root/slurm-25.05.2/etc/cgroup.conf.example /etc/slurm/cgroup.conf
  ```

  - send configuration files to other nodes
  ```shell
  scp -r /etc/slurm/*.conf  root@juice-037:/etc/slurm/
  scp -r /etc/slurm/*.conf  root@juice-038:/etc/slurm/
  ```
- grant privilege on some directories `(All Nodes)`
```shell
mkdir /var/spool/slurmd
chown slurm: /var/spool/slurmd
mkdir /var/log/slurm
chown slurm: /var/log/slurm

mkdir /var/spool/slurmctld
chown slurm: /var/spool/slurmctld

chown slurm: /etc/slurm/slurmdbd.conf
chmod 600 /etc/slurm/slurmdbd.conf

```
- start slurm services on each node

{{< tabs groupid="main" style="primary" title="Node:" icon="thumbtack" >}}
{{< tab title = "manage01" >}}
  {{< tabs groupid="tabs-resource" >}}
  {{% tab title="bash" %}}
  ```bash
systemctl start slurmdbd
systemctl enable slurmdbd

systemctl start slurmctld
systemctl enable slurmctld

systemctl start slurmd
systemctl enable slurmd
  ```
  {{% /tab %}}
  {{< /tabs >}}

  Using `systemctl status xxxx` to check if the `xxxx` service is running

    {{% expand title="Example slurmdbd.server" %}}
    ```text
    # vim /usr/lib/systemd/system/slurmdbd.service


    [Unit]
    Description=Slurm DBD accounting daemon
    After=network-online.target remote-fs.target munge.service mysql.service mysqld.service mariadb.service sssd.service
    Wants=network-online.target
    ConditionPathExists=/etc/slurm/slurmdbd.conf

    [Service]
    Type=simple
    EnvironmentFile=-/etc/sysconfig/slurmdbd
    EnvironmentFile=-/etc/default/slurmdbd
    User=slurm
    Group=slurm
    RuntimeDirectory=slurmdbd
    RuntimeDirectoryMode=0755
    ExecStart=/usr/sbin/slurmdbd -D -s $SLURMDBD_OPTIONS
    ExecReload=/bin/kill -HUP $MAINPID
    LimitNOFILE=65536


    # Uncomment the following lines to disable logging through journald.
    # NOTE: It may be preferable to set these through an override file instead.
    #StandardOutput=null
    #StandardError=null

    [Install]
    WantedBy=multi-user.target
    ```
    {{% /expand %}}

    {{% expand title="Example slumctld.server" %}}
    ```text
    # vim /usr/lib/systemd/system/slurmctld.service


    [Unit]
    Description=Slurm controller daemon
    After=network-online.target remote-fs.target munge.service sssd.service
    Wants=network-online.target
    ConditionPathExists=/etc/slurm/slurm.conf

    [Service]
    Type=notify
    EnvironmentFile=-/etc/sysconfig/slurmctld
    EnvironmentFile=-/etc/default/slurmctld
    User=slurm
    Group=slurm
    RuntimeDirectory=slurmctld
    RuntimeDirectoryMode=0755
    ExecStart=/usr/sbin/slurmctld --systemd $SLURMCTLD_OPTIONS
    ExecReload=/bin/kill -HUP $MAINPID
    LimitNOFILE=65536


    # Uncomment the following lines to disable logging through journald.
    # NOTE: It may be preferable to set these through an override file instead.
    #StandardOutput=null
    #StandardError=null

    [Install]
    WantedBy=multi-user.target
    ```
    {{% /expand %}}

    {{% expand title="Example slumd.server" %}}
    ```text
    # vim /usr/lib/systemd/system/slurmd.service


    [Unit]
    Description=Slurm node daemon
    After=munge.service network-online.target remote-fs.target sssd.service
    Wants=network-online.target
    #ConditionPathExists=/etc/slurm/slurm.conf

    [Service]
    Type=notify
    EnvironmentFile=-/etc/sysconfig/slurmd
    EnvironmentFile=-/etc/default/slurmd
    RuntimeDirectory=slurm
    RuntimeDirectoryMode=0755
    ExecStart=/usr/sbin/slurmd --systemd $SLURMD_OPTIONS
    ExecReload=/bin/kill -HUP $MAINPID
    KillMode=process
    LimitNOFILE=131072
    LimitMEMLOCK=infinity
    LimitSTACK=infinity
    Delegate=yes


    # Uncomment the following lines to disable logging through journald.
    # NOTE: It may be preferable to set these through an override file instead.
    #StandardOutput=null
    #StandardError=null

    [Install]
    WantedBy=multi-user.target
    ```
    {{% /expand %}}
{{< /tab >}}

{{< tab title = "login01" >}}
  {{< tabs groupid="tabs-resource" >}}
  {{% tab title="bash" %}}
  ```bash
systemctl start slurmd
systemctl enable slurmd
  ```
  {{% /tab %}}
  {{< /tabs >}}

  Using `systemctl status slurmd` to check if the `slurmd` service is running

{{< /tab >}}

{{< tab title = "compute01" >}}
  {{< tabs groupid="tabs-resource" >}}
  {{% tab title="bash" %}}
  ```bash
systemctl start slurmd
systemctl enable slurmd
  ```
  {{% /tab %}}
  {{< /tabs >}}

  Using `systemctl status slurmd` to check if the `slurmd` service is running
{{< /tab >}}

{{< tab title = "compute02" >}}
  {{< tabs groupid="tabs-resource" >}}
  {{% tab title="bash" %}}
  ```bash
systemctl start slurmd
systemctl enable slurmd
  ```
  {{% /tab %}}
  {{< /tabs >}}

  Using `systemctl status slurmd` to check if the `slurmd` service is running
{{< /tab >}}


{{< /tabs >}}

### Test Your Slurm Cluster `(Login Node)`
- check cluster configuration
```Bash
scontrol show config
```

- check cluster status
```Bash
sinfo
scontrol show partition
scontrol show node
```

- submit job
```bash
srun -N2 hostname
scontrol show jobs
```

- check job status
```bash
check job status
squeue -a
```

