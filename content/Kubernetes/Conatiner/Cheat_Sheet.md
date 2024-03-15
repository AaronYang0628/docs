+++
title = 'CheatShett'
date = 2024-03-07T15:00:59+08:00
weight = 1000
+++

{{< tabs title="type:" >}}

{{% tab title="podman" %}}
1. remove specific image
```shell
podman rmi <$image_id>
```

2. remove all `<none>` images
```shell
podman rmi `docker images | grep  '<none>' | awk '{print $3}'`
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
podman exec -it <$container_id> /bin/bash
```

7. run with environment
```shell
podman run -d --replace -p 18123:8123 -p 19000:9000 --name clickhouse-server -e ALLOW_EMPTY_PASSWORD=yes --ulimit nofile=262144:262144 quay.m.daocloud.io/kryptonite/clickhouse-docker-rootless:20.9.3.45 
```
`--ulimit nofile=262144:262144`: sssss
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
{{% /tab %}}

{{< /tabs >}}


