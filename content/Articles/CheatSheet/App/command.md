+++
title = 'Command'
date = 2024-03-07T15:00:59+08:00
+++

#### generate SSH key
```shell
ssh-keygen -t rsa -b 4096 -C "aaron19940628@gmail.com"
```

#### add some binary into $PATH
```shell
sudo ln -sf <$install_path>/bin/* /usr/local/bin
```
### append dir into $PATH
```shell
export PATH="/root/bin:$PATH"
```

#### copy public key to ECS
```shell
ssh-copy-id -i ~/.ssh/id_rsa.pub root@10.200.60.53
```

