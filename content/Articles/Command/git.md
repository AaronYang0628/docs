+++
title = 'Git'
date = 2024-03-07T19:58:45+08:00
weight = 1
+++

### Init global config
```shell
git config --global user.name "AaronYang"
git config --global user.email aaron19940628@gmail.com
git config --global pager.branch false
git config --global pull.ff only
git --no-pager diff
```

### Get specific file from remote
```shell
git archive --remote=git@github.com:xxxx.git main:aaa/bbb/ccc.file.name -o ddd.file.name
```

### Clone specific branch
```shell
git clone --single-branch --branch v2.4.0 https://github.com/kubernetes-sigs/sig-storage-local-static-provisioner.git
```