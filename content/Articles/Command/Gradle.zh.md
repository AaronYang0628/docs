+++
title = 'Gradle'
date = 2024-03-07T19:58:45+08:00
+++

### 1. spotless
keep your code spotless, check more detail in [https://github.com/diffplug/spotless](https://github.com/diffplug/spotless)

{{% expand title="see how to configuration" %}}

there are several files need to configure. 
1. `settings.gradle.kts`
```kotlin
plugins {
    id("org.gradle.toolchains.foojay-resolver-convention") version "0.7.0"
}
```

2. `build.gradle.kts`
```kotlin
plugins {
    id("com.diffplug.spotless") version "6.23.3"
}
configure<com.diffplug.gradle.spotless.SpotlessExtension> {
    kotlinGradle {
        target("**/*.kts")
        ktlint()
    }
    java {
        target("**/*.java")
        googleJavaFormat()
            .reflowLongStrings()
            .skipJavadocFormatting()
            .reorderImports(false)
    }
    yaml {
        target("**/*.yaml")
        jackson()
            .feature("ORDER_MAP_ENTRIES_BY_KEYS", true)
    }
    json {
        target("**/*.json")
        targetExclude(".vscode/settings.json")
        jackson()
            .feature("ORDER_MAP_ENTRIES_BY_KEYS", true)
    }
}

```

{{% /expand %}}

And the, you can execute follwoing command to format your code.

{{< tabs >}}
{{% tab title="gradle" %}}
```sh
./gradlew spotlessApply
```
{{% /tab %}}
{{% tab title="maven" %}}
```bash
./mvnw spotless:apply
```
{{% /tab %}}
{{< /tabs >}}

### 2. shadowJar
shadowjar could combine a project's dependency classes and resources into a single jar. check [https://imperceptiblethoughts.com/shadow/](https://imperceptiblethoughts.com/shadow/)

{{% expand title="see how to configuration" %}}
you need moidfy your `build.gradle.kts`

```kotlin
import com.github.jengelman.gradle.plugins.shadow.tasks.ShadowJar

plugins {
    java // Optional 
    id("com.github.johnrengelman.shadow") version "8.1.1"
}

tasks.named<ShadowJar>("shadowJar") {
    archiveBaseName.set("connector-shadow")
    archiveVersion.set("1.0")
    archiveClassifier.set("")
    manifest {
        attributes(mapOf("Main-Class" to "com.example.xxxxx.Main"))
    }
}

```

{{% /expand %}}

```shell script
./gradlew shadowJar
```

### 3. check dependency
list your project's dependencies in tree view


{{% expand title="see how to configuration" %}}
you need moidfy your `build.gradle.kts`
```kotlin

configurations {
    compileClasspath
}

{{% /expand %}}

{{< tabs >}}
{{% tab title="parent" %}}
```sh
./gradlew dependencies --configuration compileClasspath
```
{{% /tab %}}
{{% tab title="submodule" %}}
```bash
./gradlew :<$module_name>:dependencies --configuration compileClasspath
```
{{% /tab %}}
{{< /tabs >}}


{{% expand title="Check Potential Result" %}}
result will look like this
```text
compileClasspath - Compile classpath for source set 'main'.
+--- org.projectlombok:lombok:1.18.22
+--- org.apache.flink:flink-hadoop-fs:1.17.1
|    \--- org.apache.flink:flink-core:1.17.1
|         +--- org.apache.flink:flink-annotations:1.17.1
|         |    \--- com.google.code.findbugs:jsr305:1.3.9 -> 3.0.2
|         +--- org.apache.flink:flink-metrics-core:1.17.1
|         |    \--- org.apache.flink:flink-annotations:1.17.1 (*)
|         +--- org.apache.flink:flink-shaded-asm-9:9.3-16.1
|         +--- org.apache.flink:flink-shaded-jackson:2.13.4-16.1
|         +--- org.apache.commons:commons-lang3:3.12.0
|         +--- org.apache.commons:commons-text:1.10.0
|         |    \--- org.apache.commons:commons-lang3:3.12.0
|         +--- commons-collections:commons-collections:3.2.2
|         +--- org.apache.commons:commons-compress:1.21 -> 1.24.0
|         +--- org.apache.flink:flink-shaded-guava:30.1.1-jre-16.1
|         \--- com.google.code.findbugs:jsr305:1.3.9 -> 3.0.2
...
```
{{% /expand %}}