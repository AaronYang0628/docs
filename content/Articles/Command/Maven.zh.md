+++
title = 'Maven'
date = 2024-03-11T14:28:51+08:00
weight = 3
+++

### 1. build from submodule
You dont need to build from the head of project.
```shell
./mvnw clean package -DskipTests  -rf :<$submodule-name>
```

you can find the `<$submodule-name>` from submodule 's `pom.xml`
```xml
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
		xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">

	<modelVersion>4.0.0</modelVersion>

	<parent>
		<groupId>org.apache.flink</groupId>
		<artifactId>flink-formats</artifactId>
		<version>1.20-SNAPSHOT</version>
	</parent>

	<artifactId>flink-avro</artifactId>
	<name>Flink : Formats : Avro</name>
```
Then you can modify the command as 
```shell
./mvnw clean package -DskipTests  -rf :flink-avro
```

{{% expand title="The result will look like this"%}}

```text
[WARNING] For this reason, future Maven versions might no longer support building such malformed projects.
[WARNING] 
[INFO] ------------------------------------------------------------------------
[INFO] Detecting the operating system and CPU architecture
[INFO] ------------------------------------------------------------------------
[INFO] os.detected.name: linux
[INFO] os.detected.arch: x86_64
[INFO] os.detected.bitness: 64
[INFO] os.detected.version: 6.7
[INFO] os.detected.version.major: 6
[INFO] os.detected.version.minor: 7
[INFO] os.detected.release: fedora
[INFO] os.detected.release.version: 38
[INFO] os.detected.release.like.fedora: true
[INFO] os.detected.classifier: linux-x86_64
[INFO] ------------------------------------------------------------------------
[INFO] Reactor Build Order:
[INFO] 
[INFO] Flink : Formats : Avro                                             [jar]
[INFO] Flink : Formats : SQL Avro                                         [jar]
[INFO] Flink : Formats : Parquet                                          [jar]
[INFO] Flink : Formats : SQL Parquet                                      [jar]
[INFO] Flink : Formats : Orc                                              [jar]
[INFO] Flink : Formats : SQL Orc                                          [jar]
[INFO] Flink : Python                                                     [jar]
...
```
Normally, build `Flink` will start from module `flink-parent`
{{% /expand %}}


### 2. skip some other test
For example, you can skip [RAT](https://creadur.apache.org/rat/index.html "Release Audit Tool") test by doing this:
```shell
./mvnw clean package -DskipTests '-Drat.skip=true'
```
