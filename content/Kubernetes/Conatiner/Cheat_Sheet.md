+++
title = 'CheatShett'
date = 2024-03-07T15:00:59+08:00
weight = 1
+++

{{< tabs title="type:" >}}

{{% tab title="podman" %}}
1. remove specific image
```shell
podman rmi <$image_id>
```

2. remove all `<none>` images
```shell
podman rmi `podamn images | grep  '<none>' | awk '{print $3}'`
```

3. remove all stopped containers
```shell
podman container prune
```

4. remove all docker images not used
```shell
podman image prune
```

5. find ip address of a container
```shell
podman inspect --format='{{.NetworkSettings.IPAddress}}' minio-server
```

6. exec into container
```shell
podman run -it <$container_id> /bin/bash
```

7. run with environment
```shell
podman run -d --replace 
    -p 18123:8123 -p 19000:9000 \
    --name clickhouse-server \
    -e ALLOW_EMPTY_PASSWORD=yes \
    --ulimit nofile=262144:262144 \
    quay.m.daocloud.io/kryptonite/clickhouse-docker-rootless:20.9.3.45 
```
`--ulimit nofile=262144:262144`: 262144 is the maximum users process or for showing maximum user process limit for the logged-in user
> `ulimit` is admin access required Linux shell command which is used to see, set, or limit the resource usage of the current user. It is used to return the number of open file descriptors for each process. It is also used to set restrictions on the resources used by a process.

8. login registry
```shell
podman login --tls-verify=false --username=ascm-org-1710208820455 cr.registry.res.cloud.zhejianglab.com -p 'xxxx'
```

9. tag image
```shell
podman tag 76fdac66291c cr.registry.res.cloud.zhejianglab.com/ay-dev/datahub-s3-fits:1.0.0
```

10. push image
```shell
podman push cr.registry.res.cloud.zhejianglab.com/ay-dev/datahub-s3-fits:1.0.0
```
{{% /tab %}}

{{% tab title="docker" %}}
1. remove specific image
```shell
docker rmi <$image_id>
```

2. remove all `<none>` images
```shell
docker rmi `docker images | grep  '<none>' | awk '{print $3}'`
```

3. remove all stopped containers
```shell
docker container prune
```

4. remove all docker images not used
```shell
docker image prune
```

5. find ip address of a container
```shell
docker inspect --format='{{.NetworkSettings.IPAddress}}' minio-server
```

6. exec into container
```shell
docker exec -it <$container_id> /bin/bash
```

7. run with environment
```shell
docker run -d --replace -p 18123:8123 -p 19000:9000 --name clickhouse-server -e ALLOW_EMPTY_PASSWORD=yes --ulimit nofile=262144:262144 quay.m.daocloud.io/kryptonite/clickhouse-docker-rootless:20.9.3.45 
```
`--ulimit nofile=262144:262144`: sssss

8. copy file

    Copy a local file into container
    ```shell
    docker cp ./some_file CONTAINER:/work
    ```
    or  copy files from container to local path
    ```shell
    docker cp CONTAINER:/var/logs/ /tmp/app_logs
    ```
9. load a volume
```shell
docker run --rm \
    --entrypoint bash \
    -v $PWD/data:/app:ro \
    -it docker.io/minio/mc:latest \
    -c "mc --insecure alias set minio https://oss-cn-hangzhou-zjy-d01-a.ops.cloud.zhejianglab.com/ g83B2sji1CbAfjQO 2h8NisFRELiwOn41iXc6sgufED1n1A \
        && mc --insecure ls minio/csst-prod/ \
        && mc --insecure mb --ignore-existing minio/csst-prod/crp-test \
        && mc --insecure cp /app/modify.pdf minio/csst-prod/crp-test/ \
        && mc --insecure ls --recursive minio/csst-prod/"
```

{{% /tab %}}



{{< /tabs >}}


