+++
title = 'Echo'
date = 2025-09-07T19:58:45+08:00
weight = 5
tags = ["Linux", "Interview"]
+++

## 在Windows批处理中（使用ECHO命令）

```batch
ECHO 这是要写入的内容 > filename.txt
ECHO 这是要追加的内容 >> filename.txt
```

## 在Linux/macOS Shell中

```bash
echo "这是要写入的内容" > filename.txt
echo "这是要追加的内容" >> filename.txt
```

## 在Python中

```python
# 写入文件（覆盖）
with open('filename.txt', 'w', encoding='utf-8') as f:
    f.write("这是要写入的内容\n")

# 追加内容
with open('filename.txt', 'a', encoding='utf-8') as f:
    f.write("这是要追加的内容\n")
```

## 在PowerShell中

```powershell
"这是要写入的内容" | Out-File -FilePath filename.txt
"这是要追加的内容" | Out-File -FilePath filename.txt -Append
```

## 在JavaScript (Node.js) 中

```javascript
const fs = require('fs');

// 写入文件（覆盖）
fs.writeFileSync('filename.txt', '这是要写入的内容\n');

// 追加内容
fs.appendFileSync('filename.txt', '这是要追加的内容\n');
```

你想在哪种环境中使用呢？我可以提供更具体的示例。