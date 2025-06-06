+++
title = 'TXT Related'
date = 2024-04-07T15:00:59+08:00
+++


## yq
```shell
YQ_VERSION=v4.40.5
YQ_BINARY=yq_linux_amd64
wget https://github.com/mikefarah/yq/releases/download/${YQ_VERSION}/${YQ_BINARY}.tar.gz -O - | tar xz && mv ${YQ_BINARY} /usr/bin/yq
```

## jq
```shell
JQ_VERSION=1.7
JQ_BINARY=jq-linux64
wget https://github.com/stedolan/jq/releases/download/jq-${JQ_VERSION}/${JQ_BINARY}.tar.gz -O - | tar xz && mv ${JQ_BINARY} /usr/bin/jq
```

 