+++
tags = ["MariaDB"]
title = 'Install MariaDB'
date = 2024-03-07T15:00:59+08:00
weight = 90
+++


### Installation

{{< tabs groupid="prometheus" style="primary" title="Install By" icon="thumbtack" >}}

{{< tab title="Helm" style="transparent" >}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  2. Helm has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>

{{< /tab >}}

{{< tab title="ArgoCD" style="transparent">}}
  <p> <b>Preliminary </b></p>
  1. Kubernetes has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  2. argoCD has installed, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>
  3. ingres has installed on argoCD, if not check 🔗<a href="/docs/argo/argo-cd/install_argocd/index.html" target="_blank">link</a> </p></br>



{{< /tab >}}


{{< tab title="Docker Compose" style="default" >}}
  <p> <b>Preliminary </b></p>
  1. Docker has installed, if not check 🔗<a href="docs/software/container/docker/index.html" target="_blank">link</a> </p></br>
   

  {{% notice style="important" title="Using Proxy" %}} 
  you can run an addinational **daocloud** image to accelerate your pulling, check [Daocloud Proxy](daocloud/index.html)
  {{% /notice %}}

  <p> <b>1.init server </b></p>

  {{% notice style="transparent" %}}
  ```bash
  mkdir -p mariadb/data
  podman run  \
      -p 3306:3306 \
      -e MARIADB_ROOT_PASSWORD=mysql \
      -d m.daocloud.io/docker.io/library/mariadb:11.2.2-jammy \
      --log-bin \
      --binlog-format=ROW
  ```
  {{% /notice %}}

  <p> <b>2.use web console </b></p>
  And then you can visit 🔗<a href="http://localhost:8080" target="_blank">http://localhost:8080</a>

  <p> username: `root`  </p>
  <p> password: `mysql`  </p>

  {{% notice style="transparent" %}}
  ```bash
  podman run --rm -p 8080:80 \
      -e PMA_ARBITRARY=1 \
      -d m.daocloud.io/docker.io/library/phpmyadmin:5.1.1-apache
  ```
  {{% /notice %}}

  <p> <b>3.use internal client  </b></p>
  {{% notice style="transparent" %}}
  ```bash
  podman run --rm \
      -e MYSQL_PWD=mysql \
      -it m.daocloud.io/docker.io/library/mariadb:11.2.2-jammy \
      mariadb \
      --host host.containers.internal \
      --port 3306 \
      --user root \
      --database mysql \
      --execute 'select version()'
  ```
  {{% /notice %}}

{{< /tab >}}

{{< /tabs >}}


### Useful SQL
1. list all bin logs
```sql
SHOW BINARY LOGS;
```

2. delete previous bin logs
```sql
PURGE BINARY LOGS TO 'mysqld-bin.0000003'; # delete mysqld-bin.0000001 and mysqld-bin.0000002
PURGE BINARY LOGS BEFORE 'yyyy-MM-dd HH:mm:ss';
PURGE BINARY LOGS DATE_SUB(NOW(), INTERVAL 3 DAYS); # delete last three days bin log file.
```

{{% notice style="grey" icon=""%}}
If you using master-slave mode, you can change all **BINARY** to **MASTER**
{{% /notice %}}

### FAQ

{{% expand title="Q1: Show me almost **endless** possibilities" %}}
You can add standard markdown syntax:

- multiple paragraphs
- bullet point lists
- _emphasized_, **bold** and even **_bold emphasized_** text
- [links](https://example.com)
- etc.

```plaintext
...and even source code
```

> the possibilities are endless (almost - including other shortcodes may or may not work)
{{% /expand %}}


{{% expand title="Q2: Show me almost **endless** possibilities" %}}
You can add standard markdown syntax:

- multiple paragraphs
- bullet point lists
- _emphasized_, **bold** and even **_bold emphasized_** text
- [links](https://example.com)
- etc.

```plaintext
...and even source code
```

> the possibilities are endless (almost - including other shortcodes may or may not work)
{{% /expand %}}