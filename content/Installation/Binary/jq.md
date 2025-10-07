+++
title = 'JQ Binary'
date = 2024-04-07T15:00:59+08:00
weight = 100
+++

```shell
JQ_VERSION=1.7
JQ_BINARY=jq-linux64
wget https://github.com/stedolan/jq/releases/download/jq-${JQ_VERSION}/${JQ_BINARY}.tar.gz -O - | tar xz && mv ${JQ_BINARY} /usr/bin/jq
```

 