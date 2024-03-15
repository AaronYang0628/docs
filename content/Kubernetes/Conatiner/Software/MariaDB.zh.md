+++
title = 'MariaDB'
date = 2024-03-07T15:00:59+08:00
+++



### 1. init server
```sh
mkdir -p mariadb/data
podman run  \
    -p 3306:3306 \
    -e MARIADB_ROOT_PASSWORD=mysql \
    -d docker.io/library/mariadb:11.2.2-jammy \
    --log-bin \
    --binlog-format=ROW
```

{{% notice style="tip" %}}
you can run an addinational **daocloud** image to accelerate your pulling, check [Daocloud Proxy](daocloud/index.html)
{{% /notice %}}

### 2. use web console

```sh
podman run --rm -p 8080:80 \
    -e PMA_ARBITRARY=1 \
    -d docker.io/library/phpmyadmin:5.1.1-apache
```
And then you can visit [http://localhost:8080](http://localhost:8080) 

username: `root` 
password: `mysql` 

### useful SQL
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