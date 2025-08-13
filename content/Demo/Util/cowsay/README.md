+++
title = 'Cowsay V2'
date = 2024-03-08T09:59:53+08:00
weight = 5
+++

since the previous cowsay image was built ten years ago, and in newser k8s, you will meet an exception like 
> Failed to pull image "docker/whalesay:latest": [DEPRECATION NOTICE] Docker Image Format v1 and Docker Image manifest version 2, schema 1 support is disabled by default and will be removed in an upcoming release. Suggest the author of docker.io/docker/whalesay:latest to upgrade the image to the OCI Format or Docker Image manifest v2, schema 2. More information at https://docs.docker.com/go/deprecated-image-specs/



### Build
```shell
docker build -t whalesay:v2 .
```

### Usage
```shell
docker run -it localhost/whalesay:v2 whalesay  "hello world"

[root@ay-zj-ecs cowsay]# docker run -it localhost/whalesay:v2 whalesay  "hello world"
 _____________
< hello world >
 -------------
  \
   \
    \     
                      ##        .            
                ## ## ##       ==            
             ## ## ## ##      ===            
         /""""""""""""""""___/ ===        
    ~~~ {~~ ~~~~ ~~~ ~~~~ ~~ ~ /  ===- ~~~   
         \______ o          __/            
          \    \        __/             
            \____\______/   
```
```shell
docker run -it localhost/whalesay:v2 cowsay  "hello world"

[root@ay-zj-ecs cowsay]# docker run -it localhost/whalesay:v2 cowsay  "hello world"
 _____________
< hello world >
 -------------
        \   ^__^
         \  (oo)\_______
            (__)\       )\/\
                ||----w |
                ||     ||
```


### Upload

```shell
docker tag fc544e209b40 docker-registry.lab.zverse.space/ay-dev/whalesay:v2
docker push docker-registry.lab.zverse.space/ay-dev/whalesay:v2
```