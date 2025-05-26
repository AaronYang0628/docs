+++
title = 'App Related'
date = 2024-04-07T15:00:59+08:00
+++


## golang
```shell
wget https://go.dev/dl/go1.24.0.linux-amd64.tar.gz
tar -C /usr/local -xzf go1.24.0.linux-amd64.tar.gz
vim ~/.bashrc
export PATH=$PATH:/usr/local/go/bin
source ~/.bashrc
```

```shell
wget https://dlcdn.apache.org/maven/maven-3/3.9.6/binaries/apache-maven-3.9.6-bin.tar.gz
tar xzf apache-maven-3.9.6-bin.tar.gz -C /usr/local
ln -sfn /usr/local/apache-maven-3.9.6/bin/mvn /root/bin/mvn  
export PATH=/usr/local/apache-maven-3.9.6/bin:$PATH
source ~/.bashrc
```

mvn io.javaoperatorsdk:bootstrapper:5.0.4:create -DprojectGroupId=org.acme -DprojectArtifactId=metdata-operator
