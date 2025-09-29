+++
title = 'Grep'
date = 2025-09-07T19:58:45+08:00
weight = 4
tags = ["Linux", "Interview"]
+++

`grep` 是 Linux 中强大的文本搜索工具，其名称来源于 "Global Regular Expression Print"。以下是 grep 命令的常见用法：

## 基本语法
```bash
grep [选项] 模式 [文件...]
```

## 常用选项

### 1. 基础搜索
```bash
# 在文件中搜索包含"error"的行
grep "error" filename.log

# 搜索时忽略大小写
grep -i "error" filename.log

# 显示不匹配的行
grep -v "success" filename.log

# 显示匹配的行号
grep -n "pattern" filename.txt
```

### 2. 递归搜索
```bash
# 在当前目录及子目录中递归搜索
grep -r "function_name" .

# 递归搜索并显示文件名
grep -r -l "text" /path/to/directory
```

### 3. 输出控制
```bash
# 只显示匹配的文件名（不显示具体行）
grep -l "pattern" *.txt

# 显示匹配行前后的内容
grep -A 3 "error" logfile.txt    # 显示匹配行后3行
grep -B 2 "error" logfile.txt    # 显示匹配行前2行
grep -C 2 "error" logfile.txt    # 显示匹配行前后各2行

# 只显示匹配的部分（而非整行）
grep -o "pattern" file.txt
```

### 4. 正则表达式
```bash
# 使用扩展正则表达式
grep -E "pattern1|pattern2" file.txt

# 匹配以"start"开头的行
grep "^start" file.txt

# 匹配以"end"结尾的行
grep "end$" file.txt

# 匹配空行
grep "^$" file.txt

# 使用字符类
grep "[0-9]" file.txt           # 包含数字的行
grep "[a-zA-Z]" file.txt        # 包含字母的行
```

### 5. 文件处理
```bash
# 从多个文件中搜索
grep "text" file1.txt file2.txt

# 使用通配符
grep "pattern" *.log

# 从标准输入读取
cat file.txt | grep "pattern"
echo "some text" | grep "text"
```

### 6. 统计信息
```bash
# 统计匹配的行数
grep -c "pattern" file.txt

# 统计匹配的次数（可能一行有多个匹配）
grep -o "pattern" file.txt | wc -l
```

## 实用示例

### 1. 日志分析
```bash
# 查找今天的错误日志
grep "ERROR" /var/log/syslog | grep "$(date '+%Y-%m-%d')"

# 查找包含IP地址的行
grep -E "[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+" access.log
```

### 2. 代码搜索
```bash
# 在项目中查找函数定义
grep -r "function_name(" src/

# 查找包含TODO或FIXME的注释
grep -r -E "TODO|FIXME" ./

# 查找空行并统计数量
grep -c "^$" source_code.py
```

### 3. 系统监控
```bash
# 查看特定进程
ps aux | grep "nginx"

# 检查端口占用
netstat -tulpn | grep ":80"
```

### 4. 文件内容检查
```bash
# 检查配置文件中的有效设置（忽略注释和空行）
grep -v "^#" /etc/ssh/sshd_config | grep -v "^$"

# 查找包含邮箱地址的行
grep -E "\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b" file.txt
```

## 高级技巧

### 1. 使用上下文
```bash
# 显示错误及其上下文
grep -C 3 -i "error" application.log
```

### 2. 反向引用
```bash
# 使用扩展正则表达式的分组
grep -E "(abc).*\1" file.txt  # 查找重复的"abc"
```

### 3. 二进制文件搜索
```bash
# 在二进制文件中搜索文本字符串
grep -a "text" binaryfile
```

### 4. 颜色高亮
```bash
# 启用颜色高亮（通常默认开启）
grep --color=auto "pattern" file.txt
```

## 常用组合

### 与其它命令配合
```bash
# 查找并排序
grep "pattern" file.txt | sort

# 查找并计数
grep -o "pattern" file.txt | sort | uniq -c

# 查找并保存结果
grep "error" logfile.txt > errors.txt
```

这些是 grep 命令最常用的用法，掌握它们可以大大提高在 Linux 环境下处理文本的效率。