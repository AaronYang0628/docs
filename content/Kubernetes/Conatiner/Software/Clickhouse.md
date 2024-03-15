+++
title = 'Clickhouse'
date = 2024-03-07T15:00:59+08:00
weight = 1
+++



### 1. init server
```sh
mkdir -p clickhouse/{data,logs}
podman run --rm \
    --ulimit nofile=262144:262144 \
    --name clickhouse-server \
    -p 18123:8123 \
    -p 19000:9000 \
    -v $(pwd)/clickhouse/data:/var/lib/clickhouse \
    -v $(pwd)/clickhouse/logs:/var/log/clickhouse-server \
    -e CLICKHOUSE_DB=my_database \
    -e CLICKHOUSE_DEFAULT_ACCESS_MANAGEMENT=1 \
    -e CLICKHOUSE_USER=ayayay \
    -e CLICKHOUSE_PASSWORD=123456 \
    -d docker.io/clickhouse/clickhouse-server:23.11.5.29-alpine
```

{{% notice style="tip" %}}
you can run an addinational **daocloud** image to accelerate your pulling, check [Daocloud Proxy](daocloud/index.html)
{{% /notice %}}

### 2. check dashboard

And then you can visit [http://localhost:18123](http://localhost:18123) 

### 3. use cli api

address: [http://localhost:19000](http://localhost:19000) 
```sh
podman run --rm \
    --entrypoint clickhouse-client \
    -it docker.io/clickhouse/clickhouse-server:23.11.5.29-alpine \
    --host host.containers.internal \
    --port 19000 \
    --user ayayay \
    --password 123456 \
    --query "select version()"
```

### 4. use visual client

```sh
podman run --rm -p 8080:80 -d docker.io/spoonest/clickhouse-tabix-web-client:stable
```
