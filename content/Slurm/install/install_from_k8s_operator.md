+++
title = 'Install From K8s Operator'
date = 2024-08-07T15:00:59+08:00
weight = 5
+++


Despite the complex binary installation, using k8s operator is a better way to install slurm.
> Source code could be found from [https://github.com/AaronYang0628/slurm-on-k8s](https://github.com/AaronYang0628/slurm-on-k8s)

### Prequisites
1. Kubernetes has installed, if not check 🔗[link](../../Software/Binary/kubectl.md)
2. Helm binary has installed, if not check 🔗[link](../../Software/Binary/helm.md)

### Installation
1. deploy slurm operator
    ```shell
    kubectl apply -f https://raw.githubusercontent.com/AaronYang0628/helm-chart-mirror/refs/heads/main/templates/slurm/operator_install.yaml
    ```

2. check operator status
    ```shell
    kubectl get slurmdeployment
    # kubectl get slurmdep
    # kubectl -n slurm get pods
    ```

3. apply CRD slurmdeployment 
    ```shell
    kubectl apply -f https://raw.githubusercontent.com/AaronYang0628/helm-chart-mirror/refs/heads/main/templates/slurm/slurmdeployment.values.yaml
    ```

4. check operator status
    ```shell
    kubectl -n slurm get pods
    ```

