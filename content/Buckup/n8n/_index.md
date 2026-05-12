+++
title = 'N8N'
date = 2026-05-12T15:00:59+08:00
weight = 40
+++

### Method 1: Web UI Export (Recommended)

N8N 内置了工作流导入导出功能：

1. 登录 `https://n8n.72602.online`
2. 进入 Workflows 列表页面
3. 勾选需要备份的工作流
4. 点击 **Download** → 导出为 JSON 文件
5. 如需恢复，点击 **Import from File**

### Method 2: API Export

```bash
# 获取所有工作流
curl -s -u <email>:<password> https://n8n.72602.online/rest/workflows \
  | jq . > n8n-workflows-$(date +%Y%m%d).json
```

### Method 3: PostgreSQL Database Backup

N8N 的工作流定义存储在 PostgreSQL 中。备份 PG 即可包含 N8N 数据：

```bash
pg_dump -U postgres -h postgresql.database n8n > n8n-db-$(date +%Y%m%d).sql
```

> N8N 的凭证（Credentials）包含 API key 等敏感信息，建议在 Export 时选择 **Include Credentials** 并妥善保管导出的文件。
