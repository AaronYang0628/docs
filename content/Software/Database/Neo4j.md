+++
title = 'Neo4j'
date = 2024-03-07T15:00:59+08:00
weight = 5
+++


### 1. init server 
```shell
mkdir -p neo4j/data
podman run --rm \
    --name neo4j \
    -p 7474:7474 \
    -p 7687:7687 \
    -e neo4j_ROOT_PASSWORD=mysql \
    -v $(pwd)/neo4j/data:/data \
    -d docker.io/library/neo4j:5.18.0-community-bullseye
```

{{% notice style="tip" %}}
you can run an addinational **daocloud** image to accelerate your pulling, check [Daocloud Proxy](daocloud/index.html)
{{% /notice %}}


and then you can visit http://localhost:7474

username: `root` 
password: `mysql` 