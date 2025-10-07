+++
title = 'OSSutil'
date = 2024-03-24T15:00:59+08:00
weight = 3
+++

### download ossutil
first, you need to download `ossutil` first
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

### config ossutil
```shell
./ossutil config
```
| Params          | Description                                            | Instruction              | 
| --------------- | ------------------------------------------------------ | ------------------------ | 
| endpoint        | the Endpoint of the region where the Bucket is located |                          |
| accessKeyID     | OSS AccessKey                                          | get from user info panel |
| accessKeySecret | OSS AccessKeySecret                                    | get from user info panel |
| stsToken        |  token for sts service                                 | could be empty           |

{{% notice style="info" %}}
you can also modify `/home/<$user>/.ossutilconfig` file directly to change the configuration.
{{% /notice %}}
### list files
```shell
ossutil ls oss://<$PATH>
```
{{% expand title="For exmaple" %}}
```shell
ossutil ls oss://csst-data/CSST-20240312/dfs/
```
{{% /expand %}}


### download file/dir
you can use `cp` to download or upload file
```shell
ossutil cp -r oss://<$PATH> <$PTHER_PATH>
```
{{% expand title="For exmaple" %}}
```shell
ossutil cp -r oss://csst-data/CSST-20240312/dfs/ /data/nfs/data/pvc...
```
{{% /expand %}}


### upload file/dir
```shell
ossutil cp -r <$SOURCE_PATH> oss://<$PATH>
```

{{% expand title="For exmaple" %}}
```shell
ossutil cp -r /data/nfs/data/pvc/a.txt  oss://csst-data/CSST-20240312/dfs/b.txt
```
{{% /expand %}}
