+++
title = 'Open Java'
date = 2025-04-07T15:00:59+08:00
weight = 150
+++

```shell
mkdir -p /etc/apt/keyrings && \
wget -qO - https://packages.adoptium.net/artifactory/api/gpg/key/public | gpg --dearmor -o /etc/apt/keyrings/adoptium.gpg && \
echo "deb [signed-by=/etc/apt/keyrings/adoptium.gpg arch=amd64] https://packages.adoptium.net/artifactory/deb $(awk -F= '/^VERSION_CODENAME/{print$2}' /etc/os-release) main" | tee /etc/apt/sources.list.d/adoptium.list > /dev/null && \
apt-get update && \
apt-get install -y temurin-21-jdk && \
apt-get clean && \
rm -rf /var/lib/apt/lists/*
```

