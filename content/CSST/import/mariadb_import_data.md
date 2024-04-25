+++
title = 'Import CCDS MariaDB Data'
date = 2024-03-17T19:58:45+08:00
weight = 1
+++

### Preliminary
- MariaDB has installed though argo-workflow, if not check [link](argo/argo-workflow/database/mariadb/index.html)
- MariaDB server pod named is `app-mariadb` and in namespace `application`

{{% notice style="warning" %}}
if the **pod name** and **namespace** isn't match, you might need to modify following shell.
{{% /notice %}}

### Download SQL file
```shell
wget https://inner-gitlab.citybrain.org/chang.liu/ccds-server/-/raw/ccds-v1/deploy/ccds-db-init.sql -O ccds-mariadb-init.sql
```
TODO the content we download is all html, fff

### Using import tool
```shell
MARIADB_ROOT_PASSWORD=$(kubectl -n application get secret mariadb-credentials -o jsonpath='{.data.mariadb-root-password}' | base64 -d) \
TOOL_POD_NAME=$(kubectl get pod -n application -l "app.kubernetes.io/name=mariadb-tool" -o jsonpath="{.items[0].metadata.name}") \
&& export SQL_FILENAME="ccds-mariadb-init.sql" \
&& kubectl -n application cp ${SQL_FILENAME} ${TOOL_POD_NAME}:/tmp/${SQL_FILENAME} \
&& kubectl -n application exec -it deployment/app-mariadb-tool -- bash -c \
    'echo "create database ccds;" | mysql -h app-mariadb.application -uroot -p$MARIADB_ROOT_PASSWORD' \
&& kubectl -n application exec -it ${TOOL_POD_NAME} -- bash -c \
    "mysql -h app-mariadb.application -uroot -p\${MARIADB_ROOT_PASSWORD} \
    ccds < /tmp/ccds-mariadb-init.sql"
```
