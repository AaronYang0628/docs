+++
title = '**Acryl DataHub**'
date = 2024-04-07T15:00:59+08:00
weight = 13
draft = true
+++


{{%children depth="999" description="false" showhidden="true" %}}

### decode password
```shell
kubectl -n datahub get secret datahub-user-secret -o jsonpath='{.data.user\.props}' | base64 -d
```

### delete specific urn
```shell
datahub delete --urn "urn:li:container:c7a1606b8ab52f333a01493da2359de0" --recursive --hard
```

### delete all datasets
```shell
datahub delete --platform s3 --env PROD
```