+++
title = 'Database'
date = 2024-03-07T15:00:59+08:00
weight = 40
+++

{{%children depth="999" description="false" showhidden="true" %}}

### FAQ

{{% expand title="Redis 连接报 'Connection refused'" %}}
**排查步骤**：

1. 确认 Redis pod 在运行：
   ```bash
   kubectl -n storage get pods -l app.kubernetes.io/instance=redis-shared
   ```

2. 确认 Service 端点正常：
   ```bash
   kubectl -n storage get endpoints redis-shared-master
   ```

3. 从客户端 pod 内测试连通：
   ```bash
   kubectl exec -it <pod> -- redis-cli -h redis-shared-master.storage -a <password> ping
   ```

4. 如果外部应用连不上，确认使用的是正确的 namespace：
   ```
   redis-shared-master.storage.svc.cluster.local:6379
   ```

5. 如果密码不对，从 secret 获取：
   ```bash
   kubectl -n storage get secret redis-shared-credentials -o jsonpath='{.data.redis-password}' | base64 -d
   ```
{{% /expand %}}

{{% expand title="PostgreSQL 连接报 'password authentication failed'" %}}
1. 确认密码 secret 存在：
   ```bash
   kubectl -n database get secret <app>-postgres-password -o jsonpath='{.data.password}' | base64 -d
   ```

2. 如果密码改了，需要更新引用它的所有应用的 env。

3. PostgreSQL 默认只允许集群内访问。外部访问需要通过 NodePort 或 port-forward：
   ```bash
   kubectl -n database port-forward svc/postgresql 5432:5432
   ```
{{% /expand %}}

{{% expand title="Redis 如何清空所有数据" %}}
```bash
kubectl -n storage exec redis-shared-master-0 -- redis-cli -a <password> FLUSHALL
kubectl -n storage exec redis-shared-master-0 -- redis-cli -a <password> FLUSHDB
```
> ⚠️ FLUSHALL 默认已被禁用（`disableCommands: [FLUSHDB, FLUSHALL]`）。如需使用，临时移除 disableCommands 后重建 Redis。
{{% /expand %}}

{{% expand title="查看 Redis 内存使用和 key 数量" %}}
```bash
kubectl -n storage exec redis-shared-master-0 -- redis-cli -a <password> INFO memory
kubectl -n storage exec redis-shared-master-0 -- redis-cli -a <password> DBSIZE
kubectl -n storage exec redis-shared-master-0 -- redis-cli -a <password> INFO stats
```
{{% /expand %}}

{{% expand title="PostgreSQL 数据库备份和恢复" %}}
```bash
# 备份
kubectl -n database exec deployment/postgresql -- \
  pg_dump -U postgres <database> > backup.sql

# 恢复
cat backup.sql | kubectl -n database exec -i deployment/postgresql -- \
  psql -U postgres <database>
```
{{% /expand %}}


