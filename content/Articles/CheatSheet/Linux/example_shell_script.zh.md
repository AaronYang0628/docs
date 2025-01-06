+++
title = 'Shell脚本示例'
date = 2024-03-14T15:00:59+08:00
+++

### 初始化ES备份设置
在S3存储上初始化ES备份设置，并在设置完成之后，进行一个创建快照操作
```shell
#!/bin/bash
ES_HOST="http://192.168.58.2:30910"
ES_BACKUP_REPO_NAME="s3_fs_repository"
S3_CLIENT="default"
ES_BACKUP_BUCKET_IN_S3="es-snapshot"
ES_SNAPSHOT_TAG="auto"

CHECK_RESPONSE=$(curl -s -k -X POST "$ES_HOST/_snapshot/$ES_BACKUP_REPO_NAME/_verify?pretty" )
CHECKED_NODES=$(echo "$CHECK_RESPONSE" | jq -r '.nodes')


if [ "$CHECKED_NODES" == null ]; then
  echo "Doesn't exist an ES backup setting..."
  echo "A default backup setting will be generated. (using '$S3_CLIENT' s3 client and all backup files will be saved in a bucket : '$ES_BACKUP_BUCKET_IN_S3'"

  CREATE_RESPONSE=$(curl -s -k -X PUT "$ES_HOST/_snapshot/$ES_BACKUP_REPO_NAME?pretty" -H 'Content-Type: application/json' -d "{\"type\":\"s3\",\"settings\":{\"bucket\":\"$ES_BACKUP_BUCKET_IN_S3\",\"client\":\"$S3_CLIENT\"}}")
  CREATE_ACKNOWLEDGED_FLAG=$(echo "$CREATE_RESPONSE" | jq -r '.acknowledged')

  if [ "$CREATE_ACKNOWLEDGED_FLAG" == true ]; then
    echo "Buckup setting '$ES_BACKUP_REPO_NAME' has been created successfully!"
  else
    echo "Failed to create backup setting '$ES_BACKUP_REPO_NAME', since $$CREATE_RESPONSE"
  fi
else
  echo "Already exist an ES backup setting '$ES_BACKUP_REPO_NAME'"
fi

CHECK_RESPONSE=$(curl -s -k -X POST "$ES_HOST/_snapshot/$ES_BACKUP_REPO_NAME/_verify?pretty" )
CHECKED_NODES=$(echo "$CHECK_RESPONSE" | jq -r '.nodes')

if [ "$CHECKED_NODES" != null ]; then
  SNAPSHOT_NAME="meta-data-$ES_SNAPSHOT_TAG-snapshot-$(date +%s)"
  SNAPSHOT_CREATION=$(curl -s -k -X PUT "$ES_HOST/_snapshot/$ES_BACKUP_REPO_NAME/$SNAPSHOT_NAME")
  echo "Snapshot $SNAPSHOT_NAME has been created."
else
  echo "Failed to create snapshot $SNAPSHOT_NAME ."
fi

```