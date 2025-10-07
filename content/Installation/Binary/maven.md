+++
title = 'Maven Binary'
date = 2024-04-07T15:00:59+08:00
weight = 130
+++

```shell
wget https://dlcdn.apache.org/maven/maven-3/3.9.6/binaries/apache-maven-3.9.6-bin.tar.gz
tar xzf apache-maven-3.9.6-bin.tar.gz -C /usr/local
ln -sfn /usr/local/apache-maven-3.9.6/bin/mvn /root/bin/mvn  
export PATH=$PATH:/usr/local/apache-maven-3.9.6/bin
source ~/.bashrc
```
