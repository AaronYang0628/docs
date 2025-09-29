+++
title = 'ES [Local Disk]'
date = 2024-10-07T19:58:45+08:00
weight = 1
+++

### Preliminary
- ElasticSearch has installed, if not check [link](/argo/argo-cd/application/ElasticSearch/index.html)
- The `elasticsearch.yml` has configed `path.repo`, which should be set the same value of `settings.location` (this will be handled by helm chart, dont worry)

  {{% expand title="ES argocd-app yaml" %}}
  ```yaml
  apiVersion: argoproj.io/v1alpha1
  kind: Application
  metadata:
    name: elastic-search
  spec:
    syncPolicy:
      syncOptions:
      - CreateNamespace=true
    project: default
    source:
      repoURL: https://charts.bitnami.com/bitnami
      chart: elasticsearch
      targetRevision: 19.11.3
      helm:
        releaseName: elastic-search
        values: |
          global:
            kibanaEnabled: true
          clusterName: elastic
          image:
            registry: m.zjvis.net/docker.io
            pullPolicy: IfNotPresent
          security:
            enabled: false
          service:
            type: ClusterIP
          extraConfig:
            path:
              repo: /tmp
          ingress:
            enabled: true
            annotations:
              cert-manager.io/cluster-issuer: self-signed-ca-issuer
              nginx.ingress.kubernetes.io/rewrite-target: /$1
            hostname: elastic-search.dev.tech
            ingressClassName: nginx
            path: /?(.*)
            tls: true
          master:
            masterOnly: false
            replicaCount: 1
            persistence:
              enabled: false
            resources:
              requests:
                cpu: 2
                memory: 1024Mi
              limits:
                cpu: 4
                memory: 4096Mi
            heapSize: 2g
          data:
            replicaCount: 0
            persistence:
              enabled: false
          coordinating:
            replicaCount: 0
          ingest:
            enabled: true
            replicaCount: 0
            service:
              enabled: false
              type: ClusterIP
            ingress:
              enabled: false
          metrics:
            enabled: false
            image:
              registry: m.zjvis.net/docker.io
              pullPolicy: IfNotPresent
          volumePermissions:
            enabled: false
            image:
              registry: m.zjvis.net/docker.io
              pullPolicy: IfNotPresent
          sysctlImage:
            enabled: true
            registry: m.zjvis.net/docker.io
            pullPolicy: IfNotPresent
          kibana:
            elasticsearch:
              hosts:
                - '{{ include "elasticsearch.service.name" . }}'
              port: '{{ include "elasticsearch.service.ports.restAPI" . }}'
          esJavaOpts: "-Xmx2g -Xms2g"        
    destination:
      server: https://kubernetes.default.svc
      namespace: application
  ```
  {{% /expand %}}

  diff from oirginal file :
  {{< highlight type="yaml" wrap="true" hl_lines="3" >}}
  extraConfig:
      path:
        repo: /tmp
  {{< /highlight >}}

### Methods
Elasticsearch 做备份有两种方式，

1. 是将数据导出成文本文件，比如通过elasticdump、esm等工具将存储在 Elasticsearch 中的数据导出到文件中。
2. 是使用`snapshot`接口实现快照功能，增量备份文件
   
> 第一种方式相对简单，在数据量小的时候比较实用，但当应对大数据量场景时，更推荐使用snapshot api 的方式。

### Steps
{{< tabs title="buckup" >}}
{{% tab title="dump" %}}
asdadas

{{% /tab %}}

{{% tab title="snapshot" %}}
1. 创建快照仓库repo -> `my_fs_repository`
```shell
curl -k -X PUT "https://elastic-search.dev.tech:32443/_snapshot/my_fs_repository?pretty" -H 'Content-Type: application/json' -d'
{
  "type": "fs",
  "settings": {
    "location": "/tmp"
  }
}
'
```
你也能使用storage-class 挂载一个路径在pod中，将snapshot文件存放在外挂路径上

2. 验证集群各个节点是否可以使用这个快照仓库repo
```shell
curl -k -X POST "https://elastic-search.dev.tech:32443/_snapshot/my_fs_repository/_verify?pretty"
```

3. 查看快照仓库repo
```shell
curl -k -X GET "https://elastic-search.dev.tech:32443/_snapshot/_all?pretty"
```

4. 查看某一个快照仓库repo的具体setting
```shell
curl -k -X GET "https://elastic-search.dev.tech:32443/_snapshot/my_fs_repository?pretty"
```

5. 分析一个快照仓库repo
```shell
curl -k -X POST "https://elastic-search.dev.tech:32443/_snapshot/my_fs_repository/_analyze?blob_count=10&max_blob_size=1mb&timeout=120s&pretty"
```

6. 手动打快照
```shell
curl -k -X PUT "https://elastic-search.dev.tech:32443/_snapshot/my_fs_repository/ay_snap_02?pretty"
```
{{% expand title="使用SLM自动打快照(没生效)" %}}
Thank you!
{{% /expand %}}

7. 查看指定快照仓库repo 可用的快照
```shell
curl -k -X GET "https://elastic-search.dev.tech:32443/_snapshot/my_fs_repository/*?verbose=false&pretty"
```

8. 测试恢复
```shell
# Delete an index
curl -k -X DELETE "https://elastic-search.dev.tech:32443/books?pretty"

# restore that index
curl -k -X POST "https://elastic-search.dev.tech:32443/_snapshot/my_fs_repository/ay_snap_02/_restore?pretty" -H 'Content-Type: application/json' -d'
{
  "indices": "books"
}
'

# query
curl -k -X GET "https://elastic-search.dev.tech:32443/books/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "match_all": {}
  }
}
'
```

{{% /tab %}}
{{< /tabs >}}
