+++
title = 'Free Space'
date = 2024-03-14T15:00:59+08:00
+++

### Cleanup

1. find first 10 biggest files
```shell
dnf install ncdu

# 找出当前目录下最大的10个文件/目录
du -ah . | sort -rh | head -n 10

# 找出家目录下大于100M的文件
find ~ -type f -size +100M -exec ls -lh {} \; | awk '{ print $9 ": " $5 }'
```
2. clean cache
```shell
rm -rf ~/.cache/*
sudo rm -rf /tmp/*
sudo rm -rf /var/tmp/*
```

3. clean images
```shell
# 删除所有停止的容器
podman container prune -y

# 删除所有未被任何容器引用的镜像（悬空镜像）
podman image prune

# 更激进的清理：删除所有未被运行的容器使用的镜像
podman image prune -a

# 清理构建缓存
podman builder prune

# 最彻底的清理：删除所有停止的容器、所有未被容器使用的网络、所有悬空镜像和构建缓存
podman system prune
podman system prune -a # 更加彻底，会删除所有未被使用的镜像，而不仅仅是悬空的
```
4. 