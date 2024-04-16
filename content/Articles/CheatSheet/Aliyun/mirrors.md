+++
title = 'Mirrors'
date = 2024-03-14T15:00:59+08:00
+++

### Fedora

### CentOS 
- **CentOS 7** located in `/etc/yum.repos.d/`
{{% expand title="CentOS Mirror" %}}
```plaintext
[base]
name=CentOS-$releasever
#mirrorlist=http://mirrorlist.centos.org/?release=$releasever&arch=$basearch&repo=os
baseurl=http://mirror.centos.org/centos/$releasever/os/$basearch/
gpgcheck=1
gpgkey=http://mirror.centos.org/centos/RPM-GPG-KEY-CentOS-7

[extras]
name=CentOS-$releasever
#mirrorlist=http://mirrorlist.centos.org/?release=$releasever&arch=$basearch&repo=extras
baseurl=http://mirror.centos.org/centos/$releasever/extras/$basearch/
gpgcheck=1
gpgkey=http://mirror.centos.org/centos/RPM-GPG-KEY-CentOS-7
```
{{% /expand %}}
{{% expand title="Aliyun Mirror" %}}
```plaintext
[base]
name=CentOS-$releasever - Base - mirrors.aliyun.com
failovermethod=priority
baseurl=http://mirrors.aliyun.com/centos/$releasever/os/$basearch/
gpgcheck=1
gpgkey=http://mirrors.aliyun.com/centos/RPM-GPG-KEY-CentOS-7

[extras]
name=CentOS-$releasever - Extras - mirrors.aliyun.com
failovermethod=priority
baseurl=http://mirrors.aliyun.com/centos/$releasever/extras/$basearch/
gpgcheck=1
gpgkey=http://mirrors.aliyun.com/centos/RPM-GPG-KEY-CentOS-7
```
{{% /expand %}}
{{% expand title="163 Mirror" %}}
```plaintext
[base]
name=CentOS-$releasever - Base - 163.com
#mirrorlist=http://mirrorlist.centos.org/?release=$releasever&arch=$basearch&repo=os
baseurl=http://mirrors.163.com/centos/$releasever/os/$basearch/
gpgcheck=1
gpgkey=http://mirrors.163.com/centos/RPM-GPG-KEY-CentOS-7

[extras]
name=CentOS-$releasever - Extras - 163.com
#mirrorlist=http://mirrorlist.centos.org/?release=$releasever&arch=$basearch&repo=extras
baseurl=http://mirrors.163.com/centos/$releasever/extras/$basearch/
gpgcheck=1
gpgkey=http://mirrors.163.com/centos/RPM-GPG-KEY-CentOS-7
```
{{% /expand %}}
{{% expand title="Alinux"%}}
```text
[base]
name=alinux-$releasever - Base - mirrors.aliyun.com
failovermethod=priority
baseurl=http://mirrors.aliyun.com/alinux/$releasever/os/$basearch/
gpgcheck=1
gpgkey=http://mirrors.aliyun.com/alinux/RPM-GPG-KEY-ALinux-7
```
{{% /expand %}}

- **CentOS 8 stream** located in `/etc/yum.repos.d/`
{{% expand title="CentOS Mirror" %}}
```plaintext
[baseos]
name=CentOS Linux - BaseOS
#mirrorlist=http://mirrorlist.centos.org/?release=$releasever&arch=$basearch&repo=BaseOS&infra=$infra
baseurl=http://mirror.centos.org/centos/8-stream/BaseOS/$basearch/os/
gpgcheck=1
enabled=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-centosofficial

[extras]
name=CentOS Linux - Extras
#mirrorlist=http://mirrorlist.centos.org/?release=$releasever&arch=$basearch&repo=extras&infra=$infra
baseurl=http://mirror.centos.org/centos/8-stream/extras/$basearch/os/
gpgcheck=1
enabled=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-centosofficial

[appstream]
name=CentOS Linux - AppStream
#mirrorlist=http://mirrorlist.centos.org/?release=$releasever&arch=$basearch&repo=AppStream&infra=$infra
baseurl=http://mirror.centos.org/centos/8-stream/AppStream/$basearch/os/
gpgcheck=1
enabled=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-centosofficial
```
{{% /expand %}}
{{% expand title="Aliyun Mirror" %}}
```plaintext

[base]
name=CentOS-8.5.2111 - Base - mirrors.aliyun.com
baseurl=http://mirrors.aliyun.com/centos-vault/8.5.2111/BaseOS/$basearch/os/
gpgcheck=0
gpgkey=http://mirrors.aliyun.com/centos/RPM-GPG-KEY-CentOS-Official

[extras]
name=CentOS-8.5.2111 - Extras - mirrors.aliyun.com
baseurl=http://mirrors.aliyun.com/centos-vault/8.5.2111/extras/$basearch/os/
gpgcheck=0
gpgkey=http://mirrors.aliyun.com/centos/RPM-GPG-KEY-CentOS-Official

[AppStream]
name=CentOS-8.5.2111 - AppStream - mirrors.aliyun.com
baseurl=http://mirrors.aliyun.com/centos-vault/8.5.2111/AppStream/$basearch/os/
gpgcheck=0
gpgkey=http://mirrors.aliyun.com/centos/RPM-GPG-KEY-CentOS-Official
```
{{% /expand %}}


### Ubuntu
- **Ubuntu 18.04** located in `/etc/apt/sources.list`
{{% expand title="Ubuntu Mirror" %}}
```plaintext
deb http://archive.ubuntu.com/ubuntu/ bionic main restricted
deb http://archive.ubuntu.com/ubuntu/ bionic-updates main restricted
deb http://archive.ubuntu.com/ubuntu/ bionic-backports main restricted universe multiverse
deb http://security.ubuntu.com/ubuntu/ bionic-security main restricted
```
{{% /expand %}}

- **Ubuntu 20.04** located in `/etc/apt/sources.list`
{{% expand title="Ubuntu Mirror" %}}
```plaintext
deb http://archive.ubuntu.com/ubuntu/ focal main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu/ focal-updates main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu/ focal-backports main restricted universe multiverse
deb http://security.ubuntu.com/ubuntu/ focal-security main restricted
```
{{% /expand %}}
- **Ubuntu 22.04** located in `/etc/apt/sources.list`
{{% expand title="Ubuntu Mirror" %}}
```plaintext
deb http://archive.ubuntu.com/ubuntu/ jammy main restricted
deb http://archive.ubuntu.com/ubuntu/ jammy-updates main restricted
deb http://archive.ubuntu.com/ubuntu/ jammy-backports main restricted universe multiverse
deb http://security.ubuntu.com/ubuntu/ jammy-security main restricted
```
{{% /expand %}}

### Debian
- **Debian Buster** located in `/etc/apt/sources.list`
{{% expand title="Debian Mirror" %}}
```plaintext
deb http://deb.debian.org/debian buster main
deb http://security.debian.org/debian-security buster/updates main
deb http://deb.debian.org/debian buster-updates main
```
{{% /expand %}}
{{% expand title="Aliyun Mirror" %}}
```plaintext
deb http://mirrors.aliyun.com/debian/ buster main non-free contrib
deb http://mirrors.aliyun.com/debian-security buster/updates main
deb http://mirrors.aliyun.com/debian/ buster-updates main non-free contrib
deb http://mirrors.aliyun.com/debian/ buster-backports main non-free contrib
```
{{% /expand %}}
{{% expand title="Tuna Mirror" %}}
```plaintext
deb http://mirrors.tuna.tsinghua.edu.cn/debian/ buster main contrib non-free
deb http://mirrors.tuna.tsinghua.edu.cn/debian/ buster-updates main contrib non-free
deb http://mirrors.tuna.tsinghua.edu.cn/debian/ buster-backports main contrib non-free
deb http://security.debian.org/debian-security buster/updates main contrib non-free
```
{{% /expand %}}

- **Debian Bullseye** located in `/etc/apt/sources.list`
{{% expand title="Debian Mirror" %}}
```plaintext
deb http://deb.debian.org/debian bullseye main
deb http://security.debian.org/debian-security bullseye-security main
deb http://deb.debian.org/debian bullseye-updates main
```
{{% /expand %}}
{{% expand title="Aaliyun Mirror" %}}
```plaintext
deb http://mirrors.aliyun.com/debian/ bullseye main non-free contrib
deb http://mirrors.aliyun.com/debian-security/ bullseye-security main
deb http://mirrors.aliyun.com/debian/ bullseye-updates main non-free contrib
deb http://mirrors.aliyun.com/debian/ bullseye-backports main non-free contrib
```
{{% /expand %}}
{{% expand title="Tuna Mirror" %}}
```plaintext
deb http://mirrors.tuna.tsinghua.edu.cn/debian/ bullseye main contrib non-free
deb http://mirrors.tuna.tsinghua.edu.cn/debian/ bullseye-updates main contrib non-free
deb http://mirrors.tuna.tsinghua.edu.cn/debian/ bullseye-backports main contrib non-free
deb http://security.debian.org/debian-security bullseye-security main contrib non-free
```
{{% /expand %}}

### Anolis
- **Anolis 3** located in `/etc/yum.repos.d/`
{{% expand title="Alinyun Mirror" %}}
```text
[alinux3-module]
name=alinux3-module
baseurl=http://mirrors.aliyun.com/alinux/3/module/$basearch/
gpgkey=http://mirrors.aliyun.com/alinux/3/RPM-GPG-KEY-ALINUX-3
enabled=1
gpgcheck=1

[alinux3-os]
name=alinux3-os
baseurl=http://mirrors.aliyun.com/alinux/3/os/$basearch/
gpgkey=http://mirrors.aliyun.com/alinux/3/RPM-GPG-KEY-ALINUX-3
enabled=1
gpgcheck=1

[alinux3-plus]
name=alinux3-plus
baseurl=http://mirrors.aliyun.com/alinux/3/plus/$basearch/
gpgkey=http://mirrors.aliyun.com/alinux/3/RPM-GPG-KEY-ALINUX-3
enabled=1
gpgcheck=1

[alinux3-powertools]
name=alinux3-powertools
baseurl=http://mirrors.aliyun.com/alinux/3/powertools/$basearch/
gpgkey=http://mirrors.aliyun.com/alinux/3/RPM-GPG-KEY-ALINUX-3
enabled=1
gpgcheck=1

[alinux3-updates]
name=alinux3-updates
baseurl=http://mirrors.aliyun.com/alinux/3/updates/$basearch/
gpgkey=http://mirrors.aliyun.com/alinux/3/RPM-GPG-KEY-ALINUX-3
enabled=1
gpgcheck=1

[epel]
name=Extra Packages for Enterprise Linux 8 - $basearch
baseurl=http://mirrors.aliyun.com/epel/8/Everything/$basearch
failovermethod=priority
enabled=1
gpgcheck=1
gpgkey=http://mirrors.aliyun.com/epel/RPM-GPG-KEY-EPEL-8

[epel-module]
name=Extra Packages for Enterprise Linux 8 - $basearch
baseurl=http://mirrors.aliyun.com/epel/8/Modular/$basearch
failovermethod=priority
enabled=0
gpgcheck=1
gpgkey=http://mirrors.aliyun.com/epel/RPM-GPG-KEY-EPEL-8
```
{{% /expand %}}

- **Anolis 2** located in `/etc/yum.repos.d/`
{{% expand title="Alinyun Mirror" %}}
{{% /expand %}}
---

### Refresh DNS
{{< tabs title="OS:" >}}
{{% tab title="fedora" %}}
```shell
dnf clean all && dnf makecache
```
{{% /tab %}}
{{% tab title="centos" %}}
```shell
yum clean all && yum makecache
```
{{% /tab %}}
{{% tab title="ubuntu/debian" %}}
```shell
apt-get clean all
```
{{% /tab %}}
{{< /tabs >}}
