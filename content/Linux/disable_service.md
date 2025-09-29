+++
title = 'Disable Service'
date = 2024-03-14T15:00:59+08:00
+++

### Disable firewall、selinux、dnsmasq、swap service
```shell
systemctl disable --now firewalld 
systemctl disable --now dnsmasq
systemctl disable --now NetworkManager

setenforce 0
sed -i 's#SELINUX=permissive#SELINUX=disabled#g' /etc/sysconfig/selinux
sed -i 's#SELINUX=permissive#SELINUX=disabled#g' /etc/selinux/config
reboot
getenforce


swapoff -a && sysctl -w vm.swappiness=0
sed -ri '/^[^#]*swap/s@^@#@' /etc/fstab
```