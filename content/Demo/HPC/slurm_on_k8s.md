+++
title = 'Slurm On K8S'
date = 2024-08-07T15:00:59+08:00
weight = 1
+++

![slurm_on_k8s](../../../images/content/hpc/slurm_on_k8s.png)

Trying to run slurm cluster on kubernets

### Install
You can directly use helm to manage this slurm chart
1. `helm repo add ay-helm-mirror https://aaronyang0628.github.io/helm-chart-mirror/charts`
2. `helm install slurm ay-helm-mirror/slurm --version 1.0.4`

And then, you should see something like this
![func1](../../../images/content/hpc/slurm_chart.png)

Also, you can modify the [values.yaml](https://raw.githubusercontent.com/AaronYang0628/helm-chart-mirror/refs/heads/main/templates/slurm/slurm.values.yaml) by yourself, and reinstall the slurm cluster
```shell
helm upgrade --create-namespace -n slurm --install -f ./values.yaml slurm ay-helm-mirror/slurm --version=1.0.4
```


> [!IMPORTANT]
> And you even can build your own image, especially for people wanna use their own libs. For now, the image we used is
> 
> **login** --> **docker.io/aaron666/slurm-login:intel-mpi**
> 
> **slurmd** --> **docker.io/aaron666/slurm-slurmd:intel-mpi**
> 
> **slurmctld** -> **docker.io/aaron666/slurm-slurmctld:latest**
> 
> **slurmdbd** --> **docker.io/aaron666/slurm-slurmdbd:latest**
> 
> **munged** --> **docker.io/aaron666/slurm-munged:latest**
> 