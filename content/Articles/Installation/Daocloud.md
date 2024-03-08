+++
title = 'Daocloud'
date = 2024-03-07T15:00:59+08:00
+++


### 1. install container tools
```shell
systemctl stop firewalld && systemctl disable firewalld
sudo dnf install -y podman
podman run -d -P m.daocloud.io/docker.io/library/nginx
```