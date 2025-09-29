+++
title = 'Sed'
date = 2025-09-07T19:58:45+08:00
weight = 4
tags = ["Linux", "Interview"]
+++

`sed`（Stream Editor）是 Linux 中强大的流编辑器，用于对文本进行过滤和转换。以下是 sed 命令的常见用法：

## 基本语法
```bash
sed [选项] '命令' 文件
sed [选项] -e '命令1' -e '命令2' 文件
sed [选项] -f 脚本文件 文件
```

## 常用选项

### 1. 基础选项
```bash
# 编辑文件并备份原文件
sed -i.bak 's/old/new/g' file.txt

# 直接修改文件（无备份）
sed -i 's/old/new/g' file.txt

# 只打印匹配的行
sed -n '命令' file.txt

# 使用扩展正则表达式
sed -E '命令' file.txt
```

## 文本替换

### 1. 基本替换
```bash
# 替换每行第一个匹配
sed 's/old/new/' file.txt

# 替换所有匹配（全局替换）
sed 's/old/new/g' file.txt

# 替换第N次出现的匹配
sed 's/old/new/2' file.txt    # 替换第二次出现

# 只替换匹配的行
sed '/pattern/s/old/new/g' file.txt
```

### 2. 替换分隔符
```bash
# 当模式包含斜杠时，可以使用其他分隔符
sed 's|/usr/local|/opt|g' file.txt
sed 's#old#new#g' file.txt
```

### 3. 引用和转义
```bash
# 使用&引用匹配的整个文本
sed 's/[0-9]*/[&]/g' file.txt

# 使用分组引用
sed 's/\([a-z]*\) \([a-z]*\)/\2 \1/' file.txt
sed -E 's/([a-z]*) ([a-z]*)/\2 \1/' file.txt  # 扩展正则表达式
```

## 行操作

### 1. 行寻址
```bash
# 指定行号
sed '5s/old/new/' file.txt        # 只对第5行替换
sed '1,5s/old/new/g' file.txt     # 1-5行替换
sed '5,$s/old/new/g' file.txt     # 第5行到最后一行

# 使用正则表达式匹配行
sed '/^#/s/old/new/' file.txt     # 只对以#开头的行
sed '/start/,/end/s/old/new/g' file.txt  # 从start到end的行
```

### 2. 删除行
```bash
# 删除空行
sed '/^$/d' file.txt

# 删除注释行
sed '/^#/d' file.txt

# 删除特定行号
sed '5d' file.txt                 # 删除第5行
sed '1,5d' file.txt               # 删除1-5行
sed '/pattern/d' file.txt         # 删除匹配模式的行
```

### 3. 插入和添加
```bash
# 在指定行前插入
sed '5i\插入的内容' file.txt

# 在指定行后添加
sed '5a\添加的内容' file.txt

# 在文件开头插入
sed '1i\开头内容' file.txt

# 在文件末尾添加
sed '$a\结尾内容' file.txt
```

### 4. 修改行
```bash
# 替换整行
sed '5c\新的行内容' file.txt

# 替换匹配模式的行
sed '/pattern/c\新的行内容' file.txt
```

## 高级操作

### 1. 打印控制
```bash
# 只打印匹配的行（类似grep）
sed -n '/pattern/p' file.txt

# 打印行号
sed -n '/pattern/=' file.txt

# 同时打印行号和内容
sed -n '/pattern/{=;p}' file.txt
```

### 2. 多重命令
```bash
# 使用分号分隔多个命令
sed 's/old/new/g; s/foo/bar/g' file.txt

# 使用-e选项
sed -e 's/old/new/' -e 's/foo/bar/' file.txt

# 对同一行执行多个操作
sed '/pattern/{s/old/new/; s/foo/bar/}' file.txt
```

### 3. 文件操作
```bash
# 读取文件并插入
sed '/pattern/r otherfile.txt' file.txt

# 将匹配行写入文件
sed '/pattern/w output.txt' file.txt
```

### 4. 保持空间操作
```bash
# 模式空间与保持空间交换
sed '1!G;h;$!d' file.txt          # 反转文件行顺序

# 复制到保持空间
sed '/pattern/h' file.txt

# 从保持空间取回
sed '/pattern/g' file.txt
```

## 实用示例

### 1. 配置文件修改
```bash
# 修改SSH端口
sed -i 's/^#Port 22/Port 2222/' /etc/ssh/sshd_config

# 启用root登录
sed -i 's/^#PermitRootLogin yes/PermitRootLogin yes/' /etc/ssh/sshd_config

# 注释掉某行
sed -i '/pattern/s/^/#/' file.txt

# 取消注释
sed -i '/pattern/s/^#//' file.txt
```

### 2. 日志处理
```bash
# 提取时间戳
sed -n 's/.*\([0-9]\{2\}:[0-9]\{2\}:[0-9]\{2\}\).*/\1/p' logfile

# 删除空白字符
sed 's/^[ \t]*//;s/[ \t]*$//' file.txt
```

### 3. 文本格式化
```bash
# 每行末尾添加逗号
sed 's/$/,/' file.txt

# 合并连续空行
sed '/^$/{N;/^\n$/D}' file.txt

# 在每行前添加行号
sed = file.txt | sed 'N;s/\n/\t/'
```

### 4. 数据转换
```bash
# CSV转TSV
sed 's/,/\t/g' data.csv

# 转换日期格式
sed -E 's/([0-9]{4})-([0-9]{2})-([0-9]{2})/\3\/\2\/\1/g' dates.txt

# URL编码解码（简单版本）
echo "hello world" | sed 's/ /%20/g'
```

### 5. 脚本文件使用
```bash
# 创建sed脚本
cat > script.sed << EOF
s/old/new/g
/^#/d
/^$/d
EOF

# 使用脚本文件
sed -f script.sed file.txt
```

## 常用组合技巧

### 1. 与管道配合
```bash
# 查找并替换
grep "pattern" file.txt | sed 's/old/new/g'

# 处理命令输出
ls -l | sed -n '2,$p' | awk '{print $9}'
```

### 2. 复杂文本处理
```bash
# 提取XML/HTML标签内容
sed -n 's/.*<title>\(.*\)<\/title>.*/\1/p' file.html

# 处理配置文件段落的示例
sed -n '/^\[database\]/,/^\[/p' config.ini | sed '/^\[/d'
```

这些 sed 命令用法涵盖了大多数日常文本处理需求，掌握它们可以高效地进行批量文本编辑和转换操作。