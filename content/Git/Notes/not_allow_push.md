+++
title = 'Not Allow Push'
date = 2025-03-12T15:00:59+08:00
+++

### Cannot push to your own branch
![mvc](../../../images/content/article/git/403.png)

1. Edit `.git/config` file under your repo directory.
2. Find `url`=entry under section `[remote "origin"]`.
3. Change it from: 
    > `url=https://gitlab.com/AaronYang2333/ska-src-dm-local-data-preparer.git/`
   
    > `url=ssh://git@gitlab.com/AaronYang2333/ska-src-dm-local-data-preparer.git`

4. try push again