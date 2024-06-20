+++
title = 'Acryl DataHub'
date = 2024-04-07T15:00:59+08:00
weight = 5
+++


{{% children containerstyle="div" style="h4" depth="1" description="false" %}}

### decode password
```shell

```

### delete specific urn
```shell
datahub delete --urn "urn:li:container:c7a1606b8ab52f333a01493da2359de0" --recursive --hard
```

### delete all datasets
```shell
datahub delete --platform s3 --env PROD
```