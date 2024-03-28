+++
title = 'Prepare MBI L1 Fixed Data'
date = 2024-03-27T19:58:45+08:00
weight = 80
+++

### Preliminary
- `ossutil` has been installed.
- PVC `csst-data-pvc` has initialized, if not [check link](csst/init_ccds_server/index.html)
- PVC `ccds-data-pvc` has initialized, if not [check link](csst/init_ccds_server/index.html)
- PVC `csst-msc-l1-mbi-aux-pvc` has initialized, if not [check link](csst/mbi_job/index.html)

### copy data from OSS

```shell
ossutil cp -r oss://csst-data/CSST-20240312/dfs/ /data/nfs/data/application-csst-data-pvc-pvc-42f5745d-8379-462e-ba5b-3034e178eb7a
```

```shell
ossutil cp -r oss://csst-data/CSST-20240312/crdsdata/data /data/nfs/data/application-ccds-data-pvc-pvc-d773d4f7-1391-4bee-9711-df265db405fd
```

```shell
ossutil cp -r oss://csst-data/CSST-20240312/pipeline.tar.gz /data/nfs/data/application-csst-msc-l1-mbi-aux-pvc-pvc-e328eb62-d3ff-4908-b504-0413b4ea7e99/
```