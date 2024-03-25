+++
title = 'Import CSST Clickhouse Data'
date = 2024-03-17T19:58:45+08:00
weight = 2
+++

### Preliminary
- Clickhouse has installed though argo-workflow, if not check [link](kubernetes/argo/argo-workflow/software/clickhouse/index.html)
- Clickhouse server pod named is `app-clickhouse` and in namespace `application`

{{% notice style="warning" %}}
if the **pod name** and **namespace** isn't match, you might need to modify following shell.
{{% /notice %}}

### Download Data file


### Using client tool
```shell
CK_HOST="172.27.253.51"
CK_PASSWORD=$(kubectl -n application get secret clickhouse-admin-credentials -o jsonpath='{.data.password}' | base64 -d) \
&& podman run --rm --entrypoint clickhouse-client -it m.daocloud.io/docker.io/clickhouse/clickhouse-server:23.11.5.29-alpine \
     --host ${CK_HOST} \
     --port 37625 \
     --user admin \
     --password ${CK_PASSWORD} \
     --query "select version()"
```

### Init Database
```sql
create database ephem ON CLUSTER default
```

### Prepare other data files
...

### Import
```shell
podman run --rm  -v /tmp/deploy:/tmp/deploy -v /tmp/native:/share/diskdata/gaia3 \
     --entrypoint clickhouse-client \
     -it m.daocloud.io/docker.io/clickhouse/clickhouse-server:23.11.5.29-alpine \
     --host ${CK_HOST}  \
     --port 37625  \
     --user admin  \
     --password ${CK_PASSWORD} \
     --query "insert into ephem.gaia3_source_all_test FORMAT Native /share/diskdata/gaia3/100751.native" 
```
