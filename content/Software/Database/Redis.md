+++
title = 'Redis'
date = 2024-03-07T15:00:59+08:00
weight = 7
+++


### 1. init server 
```shell
mkdir -p $(pwd)/redis/data
podman run --rm \
    --name redis \
    -p 6379:6379 \
    -d docker.io/library/redis:7.2.4-alpine
```

{{% notice style="tip" %}}
you can run an addinational **daocloud** image to accelerate your pulling, check [Daocloud Proxy](daocloud/index.html)
{{% /notice %}}

### 2. use internal client 
```shell
podman run --rm \
    -it docker.io/library/redis:7.2.4-alpine \
    redis-cli \
    -h host.containers.internal \
    set mykey somevalue
```
