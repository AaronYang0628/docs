+++
title = 'Minio'
date = 2024-03-07T15:00:59+08:00
+++



### 1. init server
```sh
mkdir -p $(pwd)/minio/data
podman run --rm \
    --name minio-server \
    -p 9000:9000 \
    -p 9001:9001 \
    -v $(pwd)/minio/data:/data \
    -d docker.io/minio/minio:latest server /data --console-address :9001
```

{{% notice style="tip" %}}
you can run an addinational **daocloud** image to accelerate your pulling, check [Daocloud Proxy](daocloud/index.html)
{{% /notice %}}

### 2. check dashboard

And then you can visit [http://localhost:9001](http://localhost:9001) 

access key: `minioadmin`
access secret: `minioadmin` 

### 3. use cli api

```sh
podman run --rm \
    --entrypoint bash \
    -it docker.io/minio/mc:latest \
    -c "mc alias set minio http://host.docker.internal:9000 minioadmin minioadmin \
        && mc ls minio \
        && mc mb --ignore-existing minio/test \
        && mc cp /etc/hosts minio/test/etc/hosts \
        && mc ls --recursive minio"
```

