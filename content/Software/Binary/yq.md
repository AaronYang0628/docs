+++
title = 'YQ Binary'
date = 2024-04-07T15:00:59+08:00
+++

```shell
YQ_VERSION=v4.40.5
YQ_BINARY=yq_linux_amd64
wget https://github.com/mikefarah/yq/releases/download/${YQ_VERSION}/${YQ_BINARY}.tar.gz -O - | tar xz && mv ${YQ_BINARY} /usr/bin/yq
```
