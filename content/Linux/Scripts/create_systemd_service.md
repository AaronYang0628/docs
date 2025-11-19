+++
title = 'Create Systemd Service'
date = 2025-03-14T15:00:59+08:00
+++

1. 创建 systemd 服务文件
```shell
vim /etc/systemd/system/your-service-name.service
```

2. 添加以下内容到文件中

#### 运行一个脚本
```text
[Unit]
Description=Your Service Description
After=network.target # after: 指定在哪些服务之后启动

[Service]
Type=simple  # simple: 运行一个简单的程序 | forking: 服务会fork出新的进程 | oneshot: 运行一次 | notify: 运行并等待通知 | exec: 运行一个命令
User=root
ExecStart=/bin/bash -c "your-bash-command-here"
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target # multi-user.target: 运行在多用户模式下的目标
```

#### 运行一个程序
```text
[Unit]
Description=Backup Service
After=network.target

[Service]
Type=simple
User=root
ExecStart=/bin/bash -c "tar -czf /backup/backup-$(date +%Y%m%d).tar.gz /home/user/data"
Restart=on-failure

[Install]
WantedBy=multi-user.target
```


3. 启动服务
```shell
# 重新加载 systemd 配置
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start your-service-name

# 设置开机启动
sudo systemctl enable your-service-name

# 检查服务状态
sudo systemctl status your-service-name

# 停止服务
sudo systemctl stop your-service-name

# 禁用开机启动
sudo systemctl disable your-service-name

# 查看服务日志
sudo journalctl -u your-service-name -f
```
