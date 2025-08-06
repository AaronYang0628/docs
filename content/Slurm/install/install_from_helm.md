+++
title = 'Install From Helm Chart'
date = 2024-08-07T15:00:59+08:00
weight = 4
+++

Despite the complex binary installation, helm chart is a better way to install slurm.
> Source code could be found from [https://github.com/AaronYang0628/slurm-on-k8s](https://github.com/AaronYang0628/slurm-on-k8s)

### Prequisites
1. Kubernetes has installed, if not check 🔗[link](../../Software/Binary/kubectl.md)
2. Helm binary has installed, if not check 🔗[link](../../Software/Binary/helm.md)

### Installation
1.  get helm repo and update

    ```shell
    helm repo add ay-helm-mirror https://aaronyang0628.github.io/helm-chart-mirror/charts
    ```

2. install slurm chart

    ```shell
    # wget -O slurm.values.yaml https://raw.githubusercontent.com/AaronYang0628/slurm-on-k8s/refs/heads/main/chart/values.yaml
    helm install slurm ay-helm-mirror/chart -f slurm.values.yaml --version 1.0.9
    ```
    Or you can get template values.yaml from [https://raw.githubusercontent.com/AaronYang0628/helm-chart-mirror/refs/heads/main/templates/slurm/slurm.values.yaml](https://raw.githubusercontent.com/AaronYang0628/helm-chart-mirror/refs/heads/main/templates/slurm/slurm.values.yaml)

3. check chart status
    ```shell
    helm -n slurm list
    ```

