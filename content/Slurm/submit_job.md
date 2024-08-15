+++
title = 'Submit Jobs'
date = 2024-08-07T15:00:59+08:00
weight = 10
+++


### 3 Type Jobs

- `srun`
    is used to submit a job for execution or initiate job steps in real time. 
  * [Example]()
    1. run shell
    ```shell
    srun -N2 bin/hostname
    ```
    2. run script
    ```shell
    srun -N1 test.sh
    ```
- `sbatch`
     is used to submit a job script for later execution. The script will typically contain one or more srun commands to launch parallel tasks.
    * [Example]()
      1. submit a batch job
        ```shell
        sbatch -N2 -w "compute[01-02]" -o job.stdout /data/jobs/batch-job.slurm
        ```
        {{% expand title="batch-job.slurm" %}}
    #!/bin/bash

    #SBATCH -N 1
    #SBATCH --job-name=cpu-N1-batch
    #SBATCH --partition=compute
    #SBATCH --mail-type=end
    #SBATCH --mail-user=xxx@email.com
    #SBATCH --output=%j.out
    #SBATCH --error=%j.err

    srun -l /bin/hostname #you can still write srun <command> in here
    srun -l pwd
        {{% /expand %}}

        
      2. submit a parallel task to process differnt data partition
        ```shell
        sbatch /data/jobs/parallel.slurm
        ```
         {{% expand title="parallel.slurm" %}}
    #!/bin/bash
    #SBATCH -N 2 
    #SBATCH --job-name=cpu-N2-parallel
    #SBATCH --partition=compute
    #SBATCH --time=01:00:00
    #SBATCH --array=1-4  # 定义任务数组，假设有4个分片
    #SBATCH --ntasks-per-node=1 # 每个节点只运行一个任务
    #SBATCH --output=process_data_%A_%a.out
    #SBATCH --error=process_data_%A_%a.err

    TASK_ID=${SLURM_ARRAY_TASK_ID}

    DATA_PART="data_part_${TASK_ID}.txt" #make sure you have that file

    if [ -f ${DATA_PART} ]; then
        echo "Processing ${DATA_PART} on node $(hostname)"
        # python process_data.py --input ${DATA_PART}
    else
        echo "File ${DATA_PART} does not exist!"
    fi
        {{% /expand %}}

        {{% expand title="how to split file" %}}
    split -l 1000 data.txt data_part_ 
    && mv data_part_aa data_part_1 
    && mv data_part_ab data_part_2
        {{% /expand %}}
- `salloc`