+++
title = 'Flink S3 F3 Multiple'
date = 2024-03-08T09:59:53+08:00
weight = 5
+++

Normally, Flink only can access one S3 endpoint during the runtime. But we need to process some files from multiple minio simultaneously.

So you modify the original `flink-s3-fs-hadoop` and enable flink to do so.

```java

StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
env.enableCheckpointing(5000L, CheckpointingMode.EXACTLY_ONCE);
env.setParallelism(1);
env.setStateBackend(new HashMapStateBackend());
env.getCheckpointConfig().setCheckpointStorage("file:///./checkpoints");

final FileSource<String> source =
    FileSource.forRecordStreamFormat(
            new TextLineInputFormat(),
            new Path(
                "s3u://admin:ZrwpsezF1Lt85dxl@10.11.33.132:9000/user-data/home/conti/2024-02-08--10"))
        .build();

final FileSource<String> source2 =
    FileSource.forRecordStreamFormat(
            new TextLineInputFormat(),
            new Path(
                "s3u://minioadmin:minioadmin@10.101.16.72:9000/user-data/home/conti"))
        .build();

env.fromSource(source, WatermarkStrategy.noWatermarks(), "file-source")
    .union(env.fromSource(source2, WatermarkStrategy.noWatermarks(), "file-source2"))
    .print("union-result");
    
env.execute();
```


{{%expand title = "original usage example"%}}
using default  `flink-s3-fs-hadoop`, the configuration value will set into Hadoop configuration map.
Only one value functioning at the same, there is no way for user to operate different in single one job context.

```java 
Configuration pluginConfiguration = new Configuration();
pluginConfiguration.setString("s3a.access-key", "admin");
pluginConfiguration.setString("s3a.secret-key", "ZrwpsezF1Lt85dxl");
pluginConfiguration.setString("s3a.connection.maximum", "1000");
pluginConfiguration.setString("s3a.endpoint", "http://10.11.33.132:9000");
pluginConfiguration.setBoolean("s3a.path.style.access", Boolean.TRUE);
FileSystem.initialize(
    pluginConfiguration, PluginUtils.createPluginManagerFromRootFolder(pluginConfiguration));

StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
env.enableCheckpointing(5000L, CheckpointingMode.EXACTLY_ONCE);
env.setParallelism(1);
env.setStateBackend(new HashMapStateBackend());
env.getCheckpointConfig().setCheckpointStorage("file:///./checkpoints");

final FileSource<String> source =
    FileSource.forRecordStreamFormat(
            new TextLineInputFormat(), new Path("s3a://user-data/home/conti/2024-02-08--10"))
        .build();
env.fromSource(source, WatermarkStrategy.noWatermarks(), "file-source").print();

env.execute();
```
{{%/expand%}}


### Usage

There
{{< tabs groupid="main" style="primary" title="Install From" icon="thumbtack" >}}
{{< tab title = "Local jar" >}}
For now, you can directly download <a href="">flink-s3-fs-hadoop-$VERSION.jar</a> and load in your project.

</br><a>$VERSION</a> is the flink version you are using.

  {{< tabs groupid="example-load-local-jar" >}}
  {{% tab title="build.gradle.kts" %}}
  ```kotlin
    implementation(files("flink-s3-fs-hadoop-$flinkVersion.jar"))
  ```
  {{% /tab %}}
    {{% tab title="pom.xml" %}}
  ```xml
    <dependency>
        <groupId>org.apache</groupId>
        <artifactId>flink</artifactId>
        <version>$flinkVersion</version>
        <systemPath>${project.basedir}flink-s3-fs-hadoop-$flinkVersion.jar</systemPath>
    </dependency>
  ```
  {{% /tab %}}
  {{< /tabs >}}

the jar we provided was based on original <a href="https://github.com/apache/flink/tree/master/flink-filesystems/flink-s3-fs-hadoop">flink-s3-fs-hadoop</a> plugin, so you should use original protocal prefix <b>s3a://</b>
{{< /tab >}}

{{< tab title="PR" style="default" color="darkorchid" >}}
Or maybe you can wait from the PR, after I mereged into flink-master, you don't need to do anything, just update your flink version.

<br> and directly use <b>s3u://</b>

    
{{< /tab >}}
{{< /tabs >}}