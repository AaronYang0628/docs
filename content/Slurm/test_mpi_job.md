+++
title = 'Test MPI Jobs'
date = 2024-08-07T15:00:59+08:00
weight = 10
+++


在SLURM集群中使用MPI（Message Passing Interface）进行并行计算，通常需要以下几个步骤：

### 1. 安装MPI库
确保你的集群节点已经安装了MPI库，常见的MPI实现包括：

- OpenMPI
- MPICH
可以通过以下命令检查集群是否安装了MPI：

```bash
mpicc --version  # 检查MPI编译器
mpirun --version # 检查MPI运行时环境
```

### 2. 编译MPI程序
你可以用mpicc（C语言）或mpic++（C++语言）来编译MPI程序。例如：

以下是一个简单的MPI "Hello, World!" 示例程序，假设文件名为 `hello_mpi.c`：
```C
#include <stdio.h>
#include <mpi.h>

int main(int argc, char *argv[]) {
    int rank, size;
    
    // 初始化MPI环境
    MPI_Init(&argc, &argv);

    // 获取当前进程的rank和总进程数
    MPI_Comm_rank(MPI_COMM_WORLD, &rank);
    MPI_Comm_size(MPI_COMM_WORLD, &size);

    // 输出进程的信息
    printf("Hello, World! I am process %d out of %d processes.\n", rank, size);

    // 退出MPI环境
    MPI_Finalize();

    return 0;
}
```

### 3. 创建Slurm作业脚本
创建一个SLURM作业脚本来运行该MPI程序。以下是一个基本的SLURM作业脚本，假设文件名为 `mpi_test.slurm`:

```bash
#!/bin/bash
#SBATCH --job-name=mpi_test        # 作业名称
#SBATCH --nodes=2                  # 请求节点数
#SBATCH --ntasks-per-node=1        # 每个节点上的任务数
#SBATCH --time=00:10:00            # 最大运行时间
#SBATCH --output=mpi_test_output_%j.log  # 输出日志文件

# 加载MPI模块（如果使用模块化环境）
module load openmpi

# 运行MPI程序
mpirun -np 2 ./hello_mpi
```
### 4. 编译MPI程序
在运行作业之前，你需要编译MPI程序。在集群上使用mpicc来编译该程序。假设你将程序保存在 `hello_mpi.c` 文件中，使用以下命令进行编译：

```bash
mpicc -o hello_mpi hello_mpi.c
```

### 5. 提交Slurm作业
保存上述作业脚本（`mpi_test.slurm`）并使用以下命令提交作业：

```bash
sbatch mpi_test.slurm
```
### 6. 查看作业状态
你可以使用以下命令查看作业的状态：

```bash
squeue -u <your_username>
```
### 7. 检查输出
作业完成后，输出将保存在你作业脚本中指定的文件中（例如 `mpi_test_output_<job_id>.log`）。你可以使用 cat 或任何文本编辑器查看输出：

```bash
cat mpi_test_output_*.log
```
示例输出
如果一切正常，输出会类似于：

```text
Hello, World! I am process 0 out of 2 processes.
Hello, World! I am process 1 out of 2 processes.
```
