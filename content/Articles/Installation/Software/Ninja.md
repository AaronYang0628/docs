+++
title = 'Ninja'
date = 2024-04-07T15:00:59+08:00
+++

### install essential
```shell
sudo dnf install \
     cmake \
     gcc \
     gcc-c++ \
     ninja-build \
     make
```
{{% expand title="Cannot find ninja in repo"%}}
1. you can download source code and build by yourself
```shell
wget https://github.com/ninja-build/ninja/archive/refs/tags/v1.11.1.tar.gz
```

```shell
tar -xvf ninja-1.11.1.tar.gz 
```

```shell
# cd ninja-1.11.1
cmake -Bbuild-cmake
cmake --build build-cmake
```
{{%/expand%}}

### Ninja 


asd