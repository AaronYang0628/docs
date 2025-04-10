+++
title = 'Slurm Operator'
date = 2024-08-07T15:00:59+08:00
weight = 2
+++

> if you wanna change slurm configuration ,please check slurm configuration generator [click](https://slurm.schedmd.com/configurator.html)

- for helm user
    > just run for fun!
    1. `helm repo add ay-helm-repo https://aaronyang0628.github.io/helm-chart-mirror/charts`
    2. `helm install slurm ay-helm-repo/slurm --version 1.0.4`
- for opertaor user
    > pull an image and apply
    1. `docker pull aaron666/slurm-operator:latest`
    2. `kubectl apply -f https://raw.githubusercontent.com/AaronYang0628/helm-chart-mirror/refs/heads/main/templates/slurm/install.yaml`
    3. `kubectl apply -f https://raw.githubusercontent.com/AaronYang0628/helm-chart-mirror/refs/heads/main/templates/slurm/slurmdeployment.values.yaml`
