+++
title = 'Service'
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


### login without password
```shell
yum install sshpass -y
mkdir -p /extend/shell

cat >>/extend/shell/fenfa_pub.sh<< EOF
#!/bin/bash
ROOT_PASS=root123
ssh-keygen -t rsa -f ~/.ssh/id_rsa -P ''
for ip in 101 102 103 
do
sshpass -p\$ROOT_PASS ssh-copy-id -o StrictHostKeyChecking=no 192.168.29.\$ip
done
EOF

cd /extend/shell
chmod +x fenfa_pub.sh

 ./fenfa_pub.sh
```
