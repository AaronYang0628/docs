+++
title = 'Datahub'
date = 2024-03-07T15:00:59+08:00
weight = 3
+++

### Preliminary
- Kubernetes has installed, if not check [link](kubernetes/cluster/index.html)
- argoCD has installed, if not check [link](/argo/argo-cd/argocd/index.html)
- Elasticsearch has installed, if not check [link](/argo/argo-cd/application/elasticsearch/index.html)
- MariaDB has installed, if not check [link](/argo/argo-cd/database/mariadb//index.html)
- Kafka has installed, if not check [link](/argo/argo-cd/database/kafka//index.html)

### Steps
#### 1. prepare datahub credentials secret
{{< tabs >}}
  {{% tab title="plain" %}}
```shell
kubectl -n application \
    create secret generic datahub-credentials \
    --from-literal=mysql-root-password="$(kubectl get secret mariadb-credentials --namespace database -o jsonpath='{.data.mariadb-root-password}' | base64 -d)"
```
  {{% /tab %}}
  {{% tab title="sasl" %}}
```shell
kubectl -n application \
    create secret generic datahub-credentials \
    --from-literal=mysql-root-password="$(kubectl get secret mariadb-credentials --namespace database -o jsonpath='{.data.mariadb-root-password}' | base64 -d)" \
    --from-literal=security.protocol="SASL_PLAINTEXT" \
    --from-literal=sasl.mechanism="SCRAM-SHA-256" \
    --from-literal=sasl.jaas.config="org.apache.kafka.common.security.scram.ScramLoginModule required username=\"user1\" password=\"$(kubectl get secret kafka-user-passwords --namespace database -o jsonpath='{.data.client-passwords}' | base64 -d | cut -d , -f 1)\";"
```
  {{% /tab %}}
{{< /tabs >}}


#### 5. prepare `deploy-datahub.yaml`
{{< tabs >}}
  {{% tab title="plain" %}}
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: datahub
spec:
  syncPolicy:
    syncOptions:
    - CreateNamespace=true
  project: default
  source:
    repoURL: https://helm.datahubproject.io
    chart: datahub
    targetRevision: 0.4.8
    helm:
      releaseName: datahub
      values: |
        global:
          elasticsearch:
            host: elastic-search-elasticsearch.application.svc.cluster.local
            port: 9200
            skipcheck: "false"
            insecure: "false"
            useSSL: "false"
          kafka:
            bootstrap:
              server: kafka.database.svc.cluster.local:9092
            zookeeper:
              server: kafka-zookeeper.database.svc.cluster.local:2181
          sql:
            datasource:
              host: mariadb.database.svc.cluster.local:3306
              hostForMysqlClient: mariadb.database.svc.cluster.local
              port: 3306
              url: jdbc:mysql://mariadb.database.svc.cluster.local:3306/datahub?verifyServerCertificate=false&useSSL=true&useUnicode=yes&characterEncoding=UTF-8&enabledTLSProtocols=TLSv1.2
              driver: com.mysql.cj.jdbc.Driver
              username: root
              password:
                secretRef: datahub-credentials
                secretKey: mysql-root-password
        datahub-gms:
          enabled: true
          replicaCount: 1
          image:
            repository: m.daocloud.io/docker.io/acryldata/datahub-gms
          service:
            type: ClusterIP
          ingress:
            enabled: false
        datahub-frontend:
          enabled: true
          replicaCount: 1
          image:
            repository: m.daocloud.io/docker.io/acryldata/datahub-frontend-react
          defaultUserCredentials:
            randomAdminPassword: true
          service:
            type: ClusterIP
          ingress:
            enabled: true
            className: nginx
            annotations:
              cert-manager.io/cluster-issuer: self-signed-ca-issuer
            hosts:
            - host: datahub.dev.geekcity.tech
              paths:
              - /
            tls:
            - secretName: "datahub.dev.geekcity.tech-tls"
              hosts:
              - datahub.dev.geekcity.tech
        acryl-datahub-actions:
          enabled: true
          replicaCount: 1
          image:
            repository: m.daocloud.io/docker.io/acryldata/datahub-actions
        datahub-mae-consumer:
          replicaCount: 1
          image:
            repository: m.daocloud.io/docker.io/acryldata/datahub-mae-consumer
          ingress:
            enabled: false
        datahub-mce-consumer:
          replicaCount: 1
          image:
            repository: m.daocloud.io/docker.io/acryldata/datahub-mce-consumer
          ingress:
            enabled: false
        datahub-ingestion-cron:
          enabled: false
          image:
            repository: m.daocloud.io/docker.io/acryldata/datahub-ingestion
        elasticsearchSetupJob:
          enabled: true
          image:
            repository: m.daocloud.io/docker.io/acryldata/datahub-elasticsearch-setup
        kafkaSetupJob:
          enabled: true
          image:
            repository: m.daocloud.io/docker.io/acryldata/datahub-kafka-setup
        mysqlSetupJob:
          enabled: true
          image:
            repository: m.daocloud.io/docker.io/acryldata/datahub-mysql-setup
        postgresqlSetupJob:
          enabled: false
          image:
            repository: m.daocloud.io/docker.io/acryldata/datahub-postgres-setup
        datahubUpgrade:
          enabled: true
          image:
            repository: m.daocloud.io/docker.io/acryldata/datahub-upgrade
        datahubSystemUpdate:
          image:
            repository: m.daocloud.io/docker.io/acryldata/datahub-upgrade
  destination:
    server: https://kubernetes.default.svc
    namespace: application
```
  {{% /tab %}}
  {{% tab title="sasl" %}}
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: datahub
spec:
  syncPolicy:
    syncOptions:
    - CreateNamespace=true
  project: default
  source:
    repoURL: https://helm.datahubproject.io
    chart: datahub
    targetRevision: 0.4.8
    helm:
      releaseName: datahub
      values: |
        global:
          springKafkaConfigurationOverrides:
            security.protocol: SASL_PLAINTEXT
            sasl.mechanism: SCRAM-SHA-256
          credentialsAndCertsSecrets:
            name: datahub-credentials
            secureEnv:
              sasl.jaas.config: sasl.jaas.config
          elasticsearch:
            host: elastic-search-elasticsearch.application.svc.cluster.local
            port: 9200
            skipcheck: "false"
            insecure: "false"
            useSSL: "false"
          kafka:
            bootstrap:
              server: kafka.database.svc.cluster.local:9092
            zookeeper:
              server: kafka-zookeeper.database.svc.cluster.local:2181
          neo4j:
            host: neo4j.database.svc.cluster.local:7474
            uri: bolt://neo4j.database.svc.cluster.local
            username: neo4j
            password:
              secretRef: datahub-credentials
              secretKey: neo4j-password
          sql:
            datasource:
              host: mariadb.database.svc.cluster.local:3306
              hostForMysqlClient: mariadb.database.svc.cluster.local
              port: 3306
              url: jdbc:mysql://mariadb.database.svc.cluster.local:3306/datahub?verifyServerCertificate=false&useSSL=true&useUnicode=yes&characterEncoding=UTF-8&enabledTLSProtocols=TLSv1.2
              driver: com.mysql.cj.jdbc.Driver
              username: root
              password:
                secretRef: datahub-credentials
                secretKey: mysql-root-password
        datahub-gms:
          enabled: true
          replicaCount: 1
          image:
            repository: m.daocloud.io/docker.io/acryldata/datahub-gms
          service:
            type: ClusterIP
          ingress:
            enabled: false
        datahub-frontend:
          enabled: true
          replicaCount: 1
          image:
            repository: m.daocloud.io/docker.io/acryldata/datahub-frontend-react
          defaultUserCredentials:
            randomAdminPassword: true
          service:
            type: ClusterIP
          ingress:
            enabled: true
            className: nginx
            annotations:
              cert-manager.io/cluster-issuer: self-signed-ca-issuer
            hosts:
            - host: datahub.dev.geekcity.tech
              paths:
              - /
            tls:
            - secretName: "datahub.dev.geekcity.tech-tls"
              hosts:
              - datahub.dev.geekcity.tech
        acryl-datahub-actions:
          enabled: true
          replicaCount: 1
          image:
            repository: m.daocloud.io/docker.io/acryldata/datahub-actions
        datahub-mae-consumer:
          replicaCount: 1
          image:
            repository: m.daocloud.io/docker.io/acryldata/datahub-mae-consumer
          ingress:
            enabled: false
        datahub-mce-consumer:
          replicaCount: 1
          image:
            repository: m.daocloud.io/docker.io/acryldata/datahub-mce-consumer
          ingress:
            enabled: false
        datahub-ingestion-cron:
          enabled: false
          image:
            repository: m.daocloud.io/docker.io/acryldata/datahub-ingestion
        elasticsearchSetupJob:
          enabled: true
          image:
            repository: m.daocloud.io/docker.io/acryldata/datahub-elasticsearch-setup
        kafkaSetupJob:
          enabled: true
          image:
            repository: m.daocloud.io/docker.io/acryldata/datahub-kafka-setup
        mysqlSetupJob:
          enabled: true
          image:
            repository: m.daocloud.io/docker.io/acryldata/datahub-mysql-setup
        postgresqlSetupJob:
          enabled: false
          image:
            repository: m.daocloud.io/docker.io/acryldata/datahub-postgres-setup
        datahubUpgrade:
          enabled: true
          image:
            repository: m.daocloud.io/docker.io/acryldata/datahub-upgrade
        datahubSystemUpdate:
          image:
            repository: m.daocloud.io/docker.io/acryldata/datahub-upgrade
  destination:
    server: https://kubernetes.default.svc
    namespace: application
```
  {{% /tab %}}
{{< /tabs >}}

{{% expand title="if you wannna start one more gms"%}}
add this under `global`, if you wanna start one more gms
```shell
  datahub_standalone_consumers_enabled: true
```
{{% /expand %}}

#### 3. apply to k8s
```shell
kubectl -n argocd apply -f deploy-datahub.yaml
```

#### 4. sync by argocd
```shell
argocd app sync argocd/datahub
```


#### 5. extract credientials
```shell
kubectl -n application get secret datahub-user-secret -o jsonpath='{.data.user\.props}' | base64 -d
```

---

#### [[Optional]]() Visit though browser
> add `$K8S_MASTER_IP datahub.dev.geekcity.tech` to `/etc/hosts`

- datahub frontend: https://datahub.dev.geekcity.tech:32443
- api: https://datahub.dev.geekcity.tech:32443/openapi/swagger-ui/index.html

#### [[Optional]]() Visit though DatahubCLI

> We recommend Python virtual environments (venv-s) to namespace pip modules. Here's an example setup:

```shell
python3 -m venv venv             # create the environment
source venv/bin/activate         # activate the environment
```
> NOTE: If you install datahub in a virtual environment, that same virtual environment must be re-activated each time a shell window or session is created.

Once inside the virtual environment, install datahub using the following commands

```shell
# Requires Python 3.8+
python3 -m pip install --upgrade pip wheel setuptools
python3 -m pip install --upgrade acryl-datahub
# validate that the install was successful
datahub version
# If you see "command not found", try running this instead: python3 -m datahub version
datahub init
# authenticate your datahub CLI with your datahub instance
```