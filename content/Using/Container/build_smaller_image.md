

# 减小 Dockerfile 生成镜像体积的方法

## 1. **选择更小的基础镜像**
```dockerfile
# ❌ 避免使用完整版本
FROM ubuntu:latest

# ✅ 使用精简版本
FROM alpine:3.18
FROM python:3.11-slim
FROM node:18-alpine
```

## 2. **使用多阶段构建 (Multi-stage Build)**
这是最有效的方法之一:

```dockerfile
# 构建阶段
FROM golang:1.21 AS builder
WORKDIR /app
COPY . .
RUN go build -o myapp

# 运行阶段 - 只复制必要文件
FROM alpine:3.18
WORKDIR /app
COPY --from=builder /app/myapp .
CMD ["./myapp"]
```

## 3. **合并 RUN 指令**
每个 RUN 命令都会创建一个新层:

```dockerfile
# ❌ 多层,体积大
RUN apt-get update
RUN apt-get install -y package1
RUN apt-get install -y package2

# ✅ 单层,并清理缓存
RUN apt-get update && \
    apt-get install -y package1 package2 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
```

## 4. **清理不必要的文件**
```dockerfile
RUN apt-get update && \
    apt-get install -y build-essential && \
    # 构建操作... && \
    apt-get purge -y build-essential && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
```

## 5. **使用 .dockerignore 文件**
```bash
# .dockerignore
node_modules
.git
*.md
.env
test/
```

## 6. **只复制必要的文件**
```dockerfile
# ❌ 复制所有内容
COPY . .

# ✅ 只复制需要的文件
COPY package.json package-lock.json ./
RUN npm ci --only=production
COPY src/ ./src/
```

## 7. **移除调试工具和文档**
```dockerfile
RUN apk add --no-cache python3 && \
    rm -rf /usr/share/doc /usr/share/man
```

## 8. **压缩和优化层**
```dockerfile
# 在单个 RUN 中完成所有操作
RUN set -ex && \
    apk add --no-cache --virtual .build-deps gcc musl-dev && \
    pip install --no-cache-dir -r requirements.txt && \
    apk del .build-deps
```

## 9. **使用专门的工具**
- **dive**: 分析镜像层
  ```bash
  dive your-image:tag
  ```
- **docker-slim**: 自动精简镜像
  ```bash
  docker-slim build your-image:tag
  ```

## 实际案例对比

### 优化前 (1.2GB):
```dockerfile
FROM ubuntu:20.04
RUN apt-get update
RUN apt-get install -y python3 python3-pip
COPY . /app
WORKDIR /app
RUN pip3 install -r requirements.txt
CMD ["python3", "app.py"]
```

### 优化后 (50MB):
```dockerfile
FROM python:3.11-alpine AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

FROM python:3.11-alpine
WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY app.py .
ENV PATH=/root/.local/bin:$PATH
CMD ["python", "app.py"]
```

## 关键要点总结

✅ 使用 Alpine 或 slim 镜像  
✅ 采用多阶段构建  
✅ 合并命令并清理缓存  
✅ 配置 .dockerignore  
✅ 只安装生产环境依赖  
✅ 删除构建工具和临时文件

通过这些方法,镜像体积通常可以减少 **60-90%**!