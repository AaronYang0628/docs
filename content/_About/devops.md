+++
title = 'DevOps Resume'
date = 2026-06-04T15:00:59+08:00
weight = 10
+++


# 杨博 <font size="9">(Aaron)</font>

### <span>&#127919;</span>求职意向
__<u>云原生平台工程师 / AI基础设施工程师</u> — 用工程化能力把复杂系统从0跑到生产级__

### <span>&#128170;</span>核心技术能力

__1. 云原生 & Kubernetes 生态（专家级）__
- 精通 K8s 集群全生命周期管理：从裸金属部署到生产级运维，熟悉 RBAC、CRD、Operator 模式
- 掌握 GitOps 工作流（<span><img class="inline" src="../assets/icons/argoCD.png" height="15" width="16"> ArgoCD</span>）、Helm Chart 编写与发布、多集群架构设计
- 熟练使用 <span><img class="inline" src="../assets/icons/go.png" height="15" width="16"> Go</span> 开发 K8s Controller/Operator，完成自定义资源状态管理及 Prometheus 指标暴露

__2. AI 工程化 & LLM 工具链（前沿实践）__
- 深度使用 Coding Agent（Opencode / Codex / Claude Code），可独立完成 Skills、Plugins、MCP Server 的定制开发
- 理解 MCP（Model Context Protocol）协议生态，具备从数据获取到模型推理的全链路 AI 工具开发经验
- 掌握 <span>Knative</span> + <span>KServe</span> 的弹性推理服务架构，能完成自定义模型的上线、灰度发布与自动扩缩容

__3. 数据工程 & 大规模数据处理__
- 熟练使用 <span><img class="inline" src="../assets/icons/flink.png" height="15" width="15"> Apache Flink</span> 进行实时流计算，曾扩展 Flink S3 插件以支持跨多对象存储的 Join/Union
- 熟悉 <span><img class="inline" src="../assets/icons/calcite.png" height="15" width="14"> Apache Calcite</span> SQL 解析引擎，具备多源异构数据联邦查询经验
- 掌握 <span><img class="inline" src="../assets/icons/minio.png" height="15" width="16"> MinIO</span> / S3 兼容对象存储的架构设计与运维

__4. 研发效能 & 平台工程__
- 能独立完成从 Image 构建、Helm Chart 打包、CI（GitHub Actions / GitLab CI）到 CD（ArgoCD）的全链路搭建
- 具备内部开发者平台（IDP）从 0 到 1 的建设经验：包括元数据管理、数据工作台、HPC 集群云化
- 有开源社区贡献习惯（DataHub、Slurm SCOW），理解开源协作规范和上游贡献流程

__5. 编程语言 & 工具链__
- 主力语言：<span><img class="inline" src="../assets/icons/go.png" height="15" width="16"> Go</span>、<span><img class="inline" src="../assets/icons/java.png" height="17" width="17"> Java</span>、Python、Shell
- 数据存储：<span><img class="inline" src="../assets/icons/postgresql.png" height="15" width="16"> PostgreSQL</span>、<span><img class="inline" src="../assets/icons/mysql.png" height="20" width="30"> MySQL</span>、<span><img class="inline" src="../assets/icons/neo4j.png" height="18" width="40"> Neo4j</span>、<span><img class="inline" src="../assets/icons/clickhouse.png" height="15" width="16"> ClickHouse</span>
- 可观测性：Langfuse、 Prometheus、Grafana


### <span>&#128084;</span>工作经验

[__之江实验室-天文计算研究中心, 杭州, 中国__]()  `2024.01 - Present`

_高级研究专员 — 云原生基础设施 & AI 平台方向_<br><br>

**核心职责**：独立承担天文中心 PB 级数据存储与千核计算调度基础设施的架构设计与运维，从 0 到 1 完成多个科研平台的建设交付。

- **关键成果 & 项目**：
    - [__AstroCode —— AI 驱动天文科研工作台__]()：**从 0 到 1 独立构建**，基于 Opencode 定制开发，交付了涵盖 FITS 解析、星表查询、多巡天数据获取的 Skills/Plugins/MCP Server 体系，覆盖光学、射电等多波段数据源。天文学家通过自然语言即可完成跨巡天数据探索，将 **传统数小时的数据检索压缩至分钟级**，已投入天文中心日常科研使用。
    - [__OneAstronomy —— 多模态天文基座模型数据工程__]()：**主导端到端数据管线建设**，完成多波段（光学/红外/射电）观测数据的获取、Healpix 分区对齐与交叉匹配，输出 **TB 级高质量对齐数据集**，直接支撑多模态天文大模型的预训练。
    - [__CSST 科研工作台-元数据管理系统__](http://www.bao.ac.cn/csst/)：为中国空间站巡天望远镜（CSST）—— **国家重大科技基础设施** ——设计开发天文元数据管理系统，管理 **PB 级星表数据**，提供海量天文对象的存储索引与实时计算查询能力，直接服务 CSST 科学团队的日常科研运转。
    - [__Slurm On K8s__](../CSP/Zhejianglab/Slurm/install/_index.md)：将传统 HPC Slurm 集群 **从 0 到 1 云化至 Kubernetes**，通过 Helm Chart / Operator 实现一键部署与弹性扩缩，将 **集群交付时间从天级压缩至分钟级**，支撑千核级并行计算任务。
    - [__相场望远镜（宇宙触角）__](../Demo/Stream/cosmic-antenna.md)：为新一代宇宙射频探测装置完成 **实时数据处理系统 DEMO**，接收处理 **224 路 FPGA** 单元产生的 UDP 数据流，**设计吞吐 80Gb/s**，实时分流调用多种天文学算法，支撑科学目标发现。
    - [__Arcyl Datahub 开源贡献__](https://datahubproject.io/)：向 DataHub（**GitHub 10k+ Star** 元数据管理平台）社区贡献 Grafana Dashboard 模板及自定义数据扫描扩展。[[PR]](https://github.com/datahub-project/datahub/pull/11208)
    - [__SchedMD Slurm 社区贡献__](https://slurm.schedmd.com/)：向北大超算 SCOW 项目（**国内高校主流 HPC 平台**）贡献 Helm Chart 及安装文档优化。[[PR]](https://github.com/PKUHPC/OpenSCOW/pull/1403)
    - [__flink-s3-fs-multiple__](https://aaronyang2333.gitlab.io/docs/demo/flink-s3-f3-multiple/)：扩展 Apache Flink S3 文件系统插件，**突破原生仅支持单一 Endpoint 的限制**，使单 Job 可同时读写多个异构对象存储完成 Join/Union，消除跨存储数据搬运开销。

- 日常技术栈: 
    - <span><img class="inline" src="../assets/icons/kubernetes.png" height="17" width="17"> Kubernetes</span>, <span><img class="inline" src="../assets/icons/argoCD.png" height="20" width="20"> ArgoCD</span>, <span><img class="inline" src="../assets/icons/helm.png" height="15" width="16"> Helm</span>, <span><img class="inline" src="../assets/icons/go.png" height="15" width="16"> Go</span>, <span><img class="inline" src="../assets/icons/java.png" height="17" width="17"> Java</span>, <span><img class="inline" src="../assets/icons/minio.png" height="15" width="16"> MinIO</span>, <span><img class="inline" src="../assets/icons/flink.png" height="15" width="15"> Flink</span>
<br>

[__之江实验室-大数据智能研究中心, 杭州, 中国__]()  `2021.06 - 2023.12`

_工程专员 — 大数据平台 & 数据工程方向_<br><br>

**核心职责**：负责团队大数据分析平台的架构优化与功能迭代，保障数据处理链路和任务调度系统的高效稳定运行。

- **关键成果 & 项目**：
    - [__见微可视分析平台__](https://gitee.com/zhijiangtianshu/nebula)：**从 0 到 1 自研**开源低代码数据处理平台。通过拖拽式 DAG 编排，将 ETL、机器学习、可视化等环节统一为可复用的算子节点，使 **非开发人员无需编写脚本即可完成 TB 级数据的全流程处理**，显著降低团队的数据分析门槛。
    - [__自研爬虫框架__](https://gitea-ops.lab.zjvis.net/bee/crawler)：**从 0 到 1 自研**开源爬虫框架，创新性地将爬取任务抽象为 YAML 声明式配置 + 责任链模式执行引擎，任务定制灵活、故障自动重试。累计为团队 **节省外部数据采购费用 200W+ 元**。

- 日常技术栈: 
    - <span><img class="inline" src="../assets/icons/springboot.png" height="15" width="16"> SpringBoot</span>, <span><img class="inline" src="../assets/icons/postgresql.png" height="15" width="16"> PostgreSQL</span>, <span><img class="inline" src="../assets/icons/calcite.png" height="15" width="16"> Apache Calcite</span>, <span><img class="inline" src="../assets/icons/mysql.png" height="20" width="30"> MySQL</span>, <span><img class="inline" src="../assets/icons/neo4j.png" height="18" width="40"> Neo4j</span>, <span><img class="inline" src="../assets/icons/minio.png" height="15" width="16"> MinIO</span>
<br>

[__银江股份有限公司-中央研究院, 杭州, 中国__]()  `2017.01 - 2018.04`

_Java Web 后台开发工程师_

**核心职责**：负责大数据产品及省级政府课题项目的服务端架构设计与 API 开发，采用前后端分离协作模式，独立交付多个项目后端。

- **关键成果 & 项目**：
    - [__上海司法行政数据服务网__](https://credit.sfj.sh.gov.cn/)：整合 **省市两级 6+ 职能机构**（司法局、监狱局、法院、公证处、调解办等）的分散数据资源，构建统一的司法主题数据服务与可视化平台，**已上线服务市民**。
    - [__杭州市卡口流量分析研判平台__]()：**省级课题项目**，独立完成后端开发。系统接入全市交通卡口摄像机图像数据，实现 **全市范围**交通流量实时分析、拥堵预警及套牌车/冒牌车自动识别定位。

- 日常技术栈: 
    - <span><img class="inline" src="../assets/icons/springboot.png" height="15" width="16"> SpringBoot</span>, <span>Hadoop</span>, <span><img class="inline" src="../assets/icons/mybatis.png" height="15" width="16"> MyBatis</span>, <span><img class="inline" src="../assets/icons/oracle.png" height="15" width="16"> Oracle</span>
<br>


### <span>&#127891;</span>教育经历 

[__南加利福尼亚大学 (USC), QS 世界 Top 30, 洛杉矶, 美国__]() `2019.01 - 2021.06`

- <u>应用数据科学-硕士学位</u> [已获得]
- GPA: 3.70
- 核心课程: 
    - [机器学习](https://gitee.com/aaron2333/DSCI_552/blob/master/README.md), [数据挖掘](https://gitee.com/aaron2333/DSCI_553/blob/master/README.md), [自然语言处理](https://gitee.com/aaron2333/CSCI_544/blob/master/README.md), [知识图谱](https://gitee.com/aaron2333/DSCI_558/blob/master/README.md) <br>

- 代表项目:
    - [基于深度学习的 LOL 游戏助手](../Demo/Game/LOL-overlay-assistant.md)：基于图像识别与目标检测的 MOBA 游戏辅助客户端，使用 <span><img class="inline" src="../assets/icons/tensorflow.png" height="18" width="16"> TensorFlow2</span>, <span><img class="inline" src="../assets/icons/pyqt.png"> PyQT5</span>, Python, OCR
    - [混合推荐系统](https://gitee.com/aaron2333/DSCI_553/blob/master/project/README.md)：Switching + Cascade 混合推荐策略，融合协同过滤与用户画像。使用 <span><img class="inline" src="../assets/icons/spark.png" height="18" width="30"> Spark</span>, <span><img class="inline" src="../assets/icons/xgboost.png" height="18" width="30"> XGBoost</span>
    - [Collegiate Explorer](https://chit-chaat.github.io/Collegiate_Explorer_APP/)：知识图谱驱动的大学信息聚合平台，熔合 5 个网站数据并集成 NLP 情感分析与 NER。使用 <span><img class="inline" src="../assets/icons/spark.png" height="18" width="30"> Spark</span>, <span><img class="inline" src="../assets/icons/neo4j.png" height="18" width="40"> Neo4j</span>, <span><img class="inline" src="../assets/icons/vue.png" height="15" width="15"> Vue</span>, <span><img class="inline" src="../assets/icons/django.png" height="15" width="30"> Django</span>
<br>

- <u>硕士预科项目</u> [已完成] | GPA: 3.51
<br>

[__太原理工大学 (TYUT), 211 工程, 太原, 中国__]() `2013.09 - 2017.06`

- <u>软件工程-工学学士学位</u> [已获得]
- GPA: 3.56
- 代表项目:
    - [__Hello Hell__](https://www.bilibili.com/video/BV1uz411b7Vk)：独立完成的 2.5D 塔防安卓手游，从 UI/3D 建模到编码测试全流程一人包办，获苏软程序设计大赛（移动娱乐类）一等奖。
        - 使用: <span>Unity3D</span>, <span>C#</span>, <span>Autodesk Maya</span>, <span>PhotoShop</span>


### <span>&#128240;</span>专利 和 证书

[__之江实验室, 作为主要发明人__]()
- 一种基于概念对齐的多源异构天文数据归档查询方法及系统，专利号 [No. XX] `06/2025` [[PDF](../assets/patent/ZL-2022-1-00568.pdf)] <br> 
- 一种基于 Healpix 分区与列式存储的大规模星表管理方法，专利号 [No. XXX] `06/2025` [[PDF](../assets/patent/ZL-2022-1-00568.pdf)] <br> 
- 一种基于多源存储的跨平台虚拟文件系统及其访问方法，专利号 [No. XXX] `06/2025` [[PDF](../assets/patent/ZL-2022-1-00568.pdf)] <br> 
- 一种基于 SQL 的多源异构数据交互分析引擎及方法, 专利号 [No. CN114756629B] `06/2024` [[PDF](../assets/patent/ZL-2022-1-00568.pdf)] <br> 
- 一种页面区块的懒加载方法、装置、存储介质及设备, 专利号 [No. CN202310982912.2] `08/2023` <br>
- 一种多源异构数据关联查询加速方法、装置及设备, 专利号 [No. CN117056316B] `10/2023` [[PDF](../assets/patent/ZL-2023-1-00906.pdf)] <br>
- 一种基于知识图谱同概念下实体数据可视化配置方法与装置, 专利号 [No. CN117033420B] `10/2023` [[PDF](../assets/patent/ZL-2023-1-00846.pdf)] <br>
- 一种基于 Neo4j 及 Jena 的知识图谱构建方法与系统, 专利号 [No. ZJ-2023-1-000450-CN-02] `11/2023` <br>
- 一种基于多通道交互的数据处理系统及方法, 专利号 [No. ZJ-2023-1-000194-CN-02] `11/2023` <br>

[__银江股份有限公司, 作为参与者__]()
- 一种面向数据共享的敏感信息脱敏方法及系统, 专利号 [No. CN107480549A], `12/2017`<br>
- 基于卡口数据的城市道路交通拥堵指数计算方法, 专利号 [No. CN105869405B] `03/2018`<br>

[__计算机技术与软件专业技术资格, 中国__]()
- 中级资格（软件设计师）, No. 1750500462 `02/2018` [[PDF](../assets/nptq.png)]
- 高级资格（系统架构设计师）, No. 25505xxxx `11/2025` [[PDF](../assets/nptq.png)]
