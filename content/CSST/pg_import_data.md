+++
title = 'Import CSST Postgres Data'
date = 2024-03-17T19:58:45+08:00
weight = 2
+++

### Preliminary
- Postgresql has installed though argo-workflow, if not check [link](kubernetes/argo/argo-workflow/software/postgres/index.html)
- Postgresql server pod named is `app-postgresql` and in namespace `application`

{{% notice style="warning" %}}
if the **pod name** and **namespace** isn't match, you might need to modify following shell.
{{% /notice %}}

### Download SQL file
```shell
wget https://inner-gitlab.citybrain.org/csst/csst-py/-/raw/main/deploy/pg/init_dfs_table_data.sql -O init_dfs_table_data.sql
```
TODO the content we download is all html, fff

### Using import tool
```shell
POSTGRES_PASSWORD=$(kubectl -n application get secret postgresql-credentials -o jsonpath='{.data.postgres-password}' | base64 -d) \
POD_NAME=$(kubectl get pod -n application -l "app.kubernetes.io/name=postgresql-tool" -o jsonpath="{.items[0].metadata.name}") \
&& export SQL_FILENAME="init_dfs_table_data.sql" \
&& kubectl -n application cp ${SQL_FILENAME} ${POD_NAME}:/tmp/${SQL_FILENAME} \
&& kubectl -n application exec -it deployment/app-postgresql-tool -- bash -c \
     'echo "CREATE DATABASE csst;" | PGPASSWORD="$POSTGRES_PASSWORD" \
     psql --host app-postgresql.application -U postgres -d postgres -p 5432' \
&& kubectl -n application exec -it deployment/app-postgresql-tool -- bash -c \
     'PGPASSWORD="$POSTGRES_PASSWORD" psql --host app-postgresql.application \
     -U postgres -d csst -p 5432 < /tmp/init_dfs_table_data.sql'
```
