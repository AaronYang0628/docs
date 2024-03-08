+++
title = 'Mysql CDC'
date = 2024-03-07T15:00:59+08:00
+++

More Ofthen, we can get a simplest example form [CDC Connectors](https://ververica.github.io/flink-cdc-connectors/master/content/overview/cdc-connectors.html). But people still need to google some inescapable problems before using it.

### preliminary

Flink: `1.17`
JDK: `11`

{{% expand title="Flink CDC version mapping"%}}

| Flink CDC Version | Flink Version  |
|---------|--------------------------|
| 1.0.0   | 1.11.\*                  |
| 1.1.0   | 1.11.\*                  |
| 1.2.0   | 1.12.\*                  |
| 1.3.0   | 1.12.\*                  |
| 1.4.0   | 1.13.\*                  |
| 2.0.\*  | 1.13.\*                  |
| 2.1.\*  | 1.13.\*                  |
| 2.2.\*  | 1.13.\*, 1.14.\*         |
| 2.3.\*  | 1.13.\*, 1.14.\*, 1.15.\*|
| 2.4.\*  | 1.13.\*, 1.14.\*, 1.15.\*|
| 3.0.\*  | 1.14.\*, 1.15.\*, 1.16.\*|

{{% /expand %}}

### usage for DataStream API

Only import `com.ververica.flink-connector-mysql-cdc` is not enough.

{{< tabs >}}
{{% tab title="gradle" %}}
```kotlin
implementation("com.ververica:flink-connector-mysql-cdc:2.4.0")

//you also need these following dependencies
implementation("org.apache.flink:flink-shaded-guava:30.1.1-jre-16.1")
implementation("org.apache.flink:flink-connector-base:1.17")
implementation("org.apache.flink:flink-table-planner_2.12:1.17")
```
{{% /tab %}}
{{% tab title="maven" %}}
```xml
<dependency>
  <groupId>com.ververica</groupId>
  <!-- add the dependency matching your database -->
  <artifactId>flink-connector-mysql-cdc</artifactId>
  <!-- The dependency is available only for stable releases, SNAPSHOT dependencies need to be built based on master or release- branches by yourself. -->
  <version>2.4.0</version>
</dependency>

<!-- https://mvnrepository.com/artifact/org.apache.flink/flink-shaded-guava -->
<dependency>
  <groupId>org.apache.flink</groupId>
  <artifactId>flink-shaded-guava</artifactId>
  <version>30.1.1-jre-16.1</version>
</dependency>

<!-- https://mvnrepository.com/artifact/org.apache.flink/flink-connector-base -->
<dependency>
  <groupId>org.apache.flink</groupId>
  <artifactId>flink-connector-base</artifactId>
  <version>1.17.1</version>
</dependency>

<!-- https://mvnrepository.com/artifact/org.apache.flink/flink-table-planner -->
<dependency>
  <groupId>org.apache.flink</groupId>
  <artifactId>flink-table-planner_2.12</artifactId>
  <version>1.17.1</version>
</dependency>
```
{{% /tab %}}

{{< /tabs >}}


### usage for table/SQL API

