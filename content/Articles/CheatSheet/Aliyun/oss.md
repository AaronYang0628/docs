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
wget 
```
{{% /tab %}}
{{< /tabs >}}

### config ossutil


### list fileS
```shell
ossutil ls oss://<$PATH>
```
{{% expand title="For exmaple" %}}
```shell
ossutil ls oss://csst-data/CSST-20240312/dfs/
```
{{% /expand %}}


### download file/dir
you can use `cp` to download, upload file
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