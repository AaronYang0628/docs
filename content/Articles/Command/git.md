+++
title = 'Git'
date = 2024-03-07T19:58:45+08:00
weight = 1
+++

### Init global config
```shell
git config --global user.name "AaronYang"
git config --global user.email aaron19940628@gmail.com
git config --global pager.branch false
git config --global pull.ff only
git --no-pager diff
```

### Get specific file from remote
```shell
git archive --remote=git@github.com:<$user>/<$repo>.git <$branch>:<$source_file_path> -o <$target_source_path>
```
{{% expand title="for example"%}}
```shell
git archive --remote=git@github.com:AaronYang2333/LOL_Overlay_Assistant_Tool.git master:paper/2003.11755.pdf -o a.pdf
```
{{% /expand %}}

### Clone specific branch
```shell
git clone --single-branch --branch v2.4.0 https://github.com/kubernetes-sigs/sig-storage-local-static-provisioner.git
```

### Save credential
login first and then execute this
```shell
git config --global credential.helper store
```

### Delete Branch

* Deleting a remote branch
    ```shell
    git push origin --delete <branch>  # Git version 1.7.0 or newer
    git push origin -d <branch>        # Shorter version (Git 1.7.0 or newer)
    git push origin :<branch>          # Git versions older than 1.7.0
    ```
- Deleting a local branch
    ```shell
    git branch --delete <branch>
    git branch -d <branch> # Shorter version
    git branch -D <branch> # Force-delete un-merged branches
    ```