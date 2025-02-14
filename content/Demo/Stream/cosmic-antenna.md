+++
title = 'Cosmic Antenna'
date = 2024-03-07T19:58:45+08:00
weight = 4
+++


### Design Architecture
- #### objects
continuously processing antenna signal records and convert them into 3 dimension data matrixes, sending them to different astronomical algorithm endpoints.
![asdsaa](../../images/content/cosmic-antenna/objects.png)
- #### how data flows
![asdsaa](../../images/content/cosmic-antenna/flow.png)


### Building From Zero

Following these steps, you may build `comic-antenna` from nothing.
#### 1. install podman

you can check article [Install Podman](kubernetes/conatiner/podman/index.html)


#### 2. install kind and kubectl

you can check article [install kubectl](/kubernetes/command/install/index.html)

```shell
# create a cluster using podman
curl -o kind.cluster.yaml -L https://gitlab.com/-/snippets/3686427/raw/main/kind-cluster.yaml \
&& export KIND_EXPERIMENTAL_PROVIDER=podman \
&& kind create cluster --name cs-cluster --image m.daocloud.io/docker.io/kindest/node:v1.27.3 --config=./kind.cluster.yaml
```


{{% notice style="warning" title="Modify `~/.kube/config`" icon="stopwatch" %}}

vim ~/.kube/config

in line 5, change server: http://::xxxx -> server: http://0.0.0.0:xxxxx

{{% /notice %}}

![asdsaa](../../images/content/cosmic-antenna/kube-config.png)

#### 3. [[Optional]]() pre-downloaded slow images
```shell
DOCKER_IMAGE_PATH=/root/docker-images && mkdir -p $DOCKER_IMAGE_PATH
BASE_URL="https://resource-ops-dev.lab.zjvis.net:32443/docker-images"
for IMAGE in "quay.io_argoproj_argocd_v2.9.3.dim" \
    "ghcr.io_dexidp_dex_v2.37.0.dim" \
    "docker.io_library_redis_7.0.11-alpine.dim" \
    "docker.io_library_flink_1.17.dim"
do
    IMAGE_FILE=$DOCKER_IMAGE_PATH/$IMAGE
    if [ ! -f $IMAGE_FILE ]; then
        TMP_FILE=$IMAGE_FILE.tmp \
        && curl -o "$TMP_FILE" -L "$BASE_URL/$IMAGE" \
        && mv $TMP_FILE $IMAGE_FILE
    fi
    kind -n cs-cluster load image-archive $IMAGE_FILE
done
```
#### 4. install argocd
you can check article [Install ArgoCD](/argo/argo-cd/argocd/index.html)
    
#### 5. install essential app on argocd

```shell
# install cert manger    
curl -LO https://gitlab.com/-/snippets/3686424/raw/main/cert-manager.yaml \
&& kubectl -n argocd apply -f cert-manager.yaml \
&& argocd app sync argocd/cert-manager

# install ingress
curl -LO https://gitlab.com/-/snippets/3686426/raw/main/ingress-nginx.yaml \
&& kubectl -n argocd apply -f ingress-nginx.yaml \
&& argocd app sync argocd/ingress-nginx

# install flink-kubernetes-operator
curl -LO https://gitlab.com/-/snippets/3686429/raw/main/flink-operator.yaml \
&& kubectl -n argocd apply -f flink-operator.yaml \
&& argocd app sync argocd/flink-operator
```

#### 6. install git

```shell
sudo dnf install -y git \
&& rm -rf $HOME/cosmic-antenna-demo \
&& mkdir $HOME/cosmic-antenna-demo \
&& git clone --branch pv_pvc_template https://github.com/AaronYang2333/cosmic-antenna-demo.git $HOME/cosmic-antenna-demo
```

#### 7. prepare application image
```shell
# cd into  $HOME/cosmic-antenna-demo
sudo dnf install -y java-11-openjdk.x86_64 \
&& $HOME/cosmic-antenna-demo/gradlew :s3sync:buildImage \
&& $HOME/cosmic-antenna-demo/gradlew :fpga-mock:buildImage
```

```shell
# save and load into cluster
VERSION="1.0.3"
podman save --quiet -o $DOCKER_IMAGE_PATH/fpga-mock_$VERSION.dim localhost/fpga-mock:$VERSION \
&& kind -n cs-cluster load image-archive $DOCKER_IMAGE_PATH/fpga-mock_$VERSION.dim
podman save --quiet -o $DOCKER_IMAGE_PATH/s3sync_$VERSION.dim localhost/s3sync:$VERSION \
&& kind -n cs-cluster load image-archive $DOCKER_IMAGE_PATH/s3sync_$VERSION.dim
```

```shell
kubectl -n flink edit role/flink -o yaml
```

{{% notice style="warning" title="Modify role config" icon="stopwatch" %}}

```shell
kubectl -n flink edit role/flink -o yaml
```
add `services` and `endpoints` to the `rules.resources`

{{% /notice %}}

#### 8. prepare k8s resources [pv, pvc, sts]
```shell
cp -rf $HOME/cosmic-antenna-demo/flink/*.yaml /tmp \
&& podman exec -d cs-cluster-control-plane mkdir -p /mnt/flink-job
# create persist volume
kubectl -n flink create -f /tmp/pv.template.yaml
# create pv claim
kubectl -n flink create -f /tmp/pvc.template.yaml
# start up flink application
kubectl -n flink create -f /tmp/job.template.yaml
# start up ingress
kubectl -n flink create -f /tmp/ingress.forward.yaml
```

```shell
# start up fpga UDP client, sending data 
cp $HOME/cosmic-antenna-demo/fpga-mock/client.template.yaml /tmp \
&& kubectl -n flink create -f /tmp/client.template.yaml
```

#### 9. check dashboard in browser

> http://job-template-example.flink.lab.zjvis.net


### Repo
you can get code from [github](https://github.com/ben-wangz/cosmic-antenna-demo)

---
# Reference
1. https://github.com/ben-wangz/blog/tree/main/docs/content/6.kubernetes/7.installation/ha-cluster
2. xxx