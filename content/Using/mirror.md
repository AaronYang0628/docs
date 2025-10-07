+++
title = 'Mirrors [Aliyun, Tsinghua]'
date = 2024-03-07T15:00:59+08:00
+++


#### Gradle Tencent Mirror
`https://mirrors.cloud.tencent.com/gradle/gradle-8.0-bin.zip`

#### PIP Tuna Mirror `-i https://pypi.tuna.tsinghua.edu.cn/simple `
```shell
pip install -i https://pypi.tuna.tsinghua.edu.cn/simple some-package
```

#### Maven Mirror
```xml
<mirror>
    <id>aliyunmaven</id>
    <mirrorOf>*</mirrorOf>
    <name>阿里云公共仓库</name>
    <url>https://maven.aliyun.com/repository/public</url>
</mirror>
```

