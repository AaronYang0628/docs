+++
title = 'OSSutil'
date = 2024-03-24T15:00:59+08:00
weight = 3
+++

 阿里版本的 `Minio`(https://min.io/)

### 下载 ossutil
首先，你需要下载 `ossutil` 二进制文件
{{< tabs title="OS:" >}}
{{% tab title="linux" %}}
```shell
curl https://gosspublic.alicdn.com/ossutil/install.sh  | sudo bash
```
{{% /tab %}}
{{% tab title="windows" %}}
```shell
curl -o ossutil-v1.7.19-windows-386.zip https://gosspublic.alicdn.com/ossutil/1.7.19/ossutil-v1.7.19-windows-386.zip
```
{{% /tab %}}
{{< /tabs >}}

### 配置 ossutil
```shell
./ossutil config
```
| Params          | Description                                            | Instruction                    | 
| --------------- | ------------------------------------------------------ | ------------------------------- | 
| endpoint        | the Endpoint of the region where the Bucket is located | 通过OSS页面找到endpoin 地址      |
| accessKeyID     | OSS AccessKey                                          | 通过用户中心找到accessKey        |
| accessKeySecret | OSS AccessKeySecret                                    | 通过用户中心找到accessKeySecret  |
| stsToken        |  token for sts service                                 | 可以为空                        |

{{% notice style="info" %}}
您还可以直接修改 `/home/<$user>/.ossutilconfig` 文件来配置ossutil。
{{% /notice %}}
### 展示文件
```shell
ossutil ls oss://<$PATH>
```
{{% expand title="For exmaple" %}}
```shell
ossutil ls oss://csst-data/CSST-20240312/dfs/
```
{{% /expand %}}


### 下载文件/文件夹
你能用 `cp` 上传或者下载文件
```shell
ossutil cp -r oss://<$PATH> <$PTHER_PATH>
```
{{% expand title="For exmaple" %}}
```shell
ossutil cp -r oss://csst-data/CSST-20240312/dfs/ /data/nfs/data/pvc... #从OSS下载文件到本地/data/nfs/data/pvc...
```
{{% /expand %}}


### 上传文件/文件夹
```shell
ossutil cp -r <$SOURCE_PATH> oss://<$PATH>
```

{{% expand title="For exmaple" %}}
```shell
ossutil cp -r /data/nfs/data/pvc/a.txt  oss://csst-data/CSST-20240312/dfs/b.txt #从本地上传文件到OSS
```
{{% /expand %}}
