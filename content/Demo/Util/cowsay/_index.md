+++
title = 'Cowsay'
date = 2025-03-07T19:58:45+08:00
weight = 300
+++


since the previous cowsay image was built ten years ago, and in newser k8s, you will meet an exception like 
> Failed to pull image "docker/whalesay:latest": [DEPRECATION NOTICE] Docker Image Format v1 and Docker Image manifest version 2, schema 1 support is disabled by default and will be removed in an upcoming release. Suggest the author of docker.io/docker/whalesay:latest to upgrade the image to the OCI Format or Docker Image manifest v2, schema 2. More information at https://docs.docker.com/go/deprecated-image-specs/


So, I built a new one. please try `docker.io/aaron666/cowsay:v2`



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

{{< tabs title="registry" >}}
{{% tab title="zjlab" %}}
```shell
docker tag 5b01b0c3c7ce docker-registry.lab.zverse.space/ay-dev/whalesay:v2
docker push docker-registry.lab.zverse.space/ay-dev/whalesay:v2
```
{{% /tab %}}
{{% tab title="dockerhub" %}}
```shell
export DOCKER_PAT=dckr_pat_bBN_Xkgz-TRdxirM2B6EDYCjjrg
echo $DOCKER_PAT | docker login docker.io -u aaron666  --password-stdin
docker tag 5b01b0c3c7ce docker.io/aaron666/whalesay:v2
docker push docker.io/aaron666/whalesay:v2
```
{{% /tab %}}
{{% tab title="github" %}}
```shell
export GITHUB_PAT=XXXX
echo $GITHUB_PAT | docker login ghcr.io -u aaronyang0628 --password-stdin
docker tag 5b01b0c3c7ce ghcr.io/aaronyang0628/whalesay:v2
docker push ghcr.io/aaronyang0628/whalesay:v2
```
{{% /tab %}}

{{< /tabs >}}
