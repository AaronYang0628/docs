+++
title = 'Golang Binary'
date = 2024-04-07T15:00:59+08:00
weight = 70
+++

```shell
# sudo rm -rf /usr/local/go  # 删除旧版本
wget https://go.dev/dl/go1.24.4.linux-amd64.tar.gz
tar -C /usr/local -xzf go1.24.4.linux-amd64.tar.gz
vim ~/.bashrc
export PATH=$PATH:/usr/local/go/bin
source ~/.bashrc
```