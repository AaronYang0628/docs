+++
title = 'File Operations' 
date = 2024-08-07T15:00:59+08:00
weight = 5
+++


### 文件分发

- `sbcast`
    用于将文件从提交节点分发到计算节点。它特别适用于需要将大量或较大的数据文件分发到多个计算节点的情况，能够减少分发时间并提高效率。
  * [特性]()
    1. `快速分发文件`：将文件快速复制到作业分配的所有计算节点，避免手动分发文件的麻烦。比传统的 scp 或 rsync 更快，尤其是在分发到多个节点时。
    2. `简化作业脚本`：自动处理文件分发，使作业脚本更简洁。
    3. `提高效率`：通过并行传输提高文件分发速度，尤其是对大文件或多个文件的分发。
  * [用例]()
    1. 单独使用
    ```shell
    sbcast <source_file> <destination_path>
    ```
    2. 嵌入作业脚本
    ```bash
    #!/bin/bash
    #SBATCH --job-name=example_job
    #SBATCH --output=example_job.out
    #SBATCH --error=example_job.err
    #SBATCH --partition=compute
    #SBATCH --nodes=4

    # 使用 sbcast 将文件分发到每个节点的 /tmp 目录
    sbcast data.txt /tmp/data.txt

    # 执行你的程序，使用分发的文件
    srun my_program /tmp/data.txt

    ```
### 文件收集
1. 重定向
   在提交作业时，可以使用 #SBATCH --output 和 #SBATCH --error 指令将标准输出和标准错误重定向到指定文件
   ```bash
    #SBATCH --output=output.txt
    #SBATCH --error=error.txt
    ```
    或者
    ```shell
    sbatch -N2 -w "compute[01-02]" -o result/file/path xxx.slurm
    ```
2. 手动发送目标地址
   在提交作业时，在作业中使用 `scp` 或 `rsync` 将文件从计算节点复制到提交节点

3. 使用NFS
   如果计算集群中配置了共享文件系统（如 NFS、Lustre 或 GPFS），可以直接将结果文件写入共享目录。这样，所有节点生成的结果文件会自动存储在同一个位置

4. 使用`sbcast`
