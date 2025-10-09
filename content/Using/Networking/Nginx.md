+++
title = 'Nginx 性能优化'
date = 2024-10-07T19:58:45+08:00
tags = ["Nginx", "Interview"]
weight = 6
+++


从**通用优化、操作系统层、Nginx 配置层、架构层**等多个维度，为你详细梳理的方式。

---

### 一、操作系统与硬件层优化

这是优化的基础，为 Nginx 提供一个高性能的运行环境。

1.  **增加文件描述符限制**
    Nginx 每个连接（尤其是静态文件）都会消耗一个文件描述符。如果并发高，默认限制很容易成为瓶颈。
    ```bash
    # 临时生效
    ulimit -n 65536

    # 永久生效，修改 /etc/security/limits.conf
    * soft nofile 65536
    * hard nofile 65536

    # 同时，确保 nginx.conf 中使用了足够的 worker_rlimit_nofile
    worker_rlimit_nofile 65536;
    ```

2.  **优化网络栈**
    *   **调整 `net.core.somaxconn`**： 定义等待 Nginx 接受的最大连接队列长度。如果遇到 `accept()` 队列溢出的错误，需要增加这个值。
        ```bash
        sysctl -w net.core.somaxconn=65535
        ```
        并在 Nginx 的 `listen` 指令中显式指定 `backlog` 参数：
        ```
        listen 80 backlog=65535;
        ```
    *   **启用 TCP Fast Open**： 减少 TCP 三次握手的延迟。
        ```bash
        sysctl -w net.ipv4.tcp_fastopen=3
        ```
    *   **增大临时端口范围**： 当 Nginx 作为反向代理时，它需要大量本地端口来连接上游服务器。
        ```bash
        sysctl -w net.ipv4.ip_local_port_range="1024 65535"
        ```
    *   **减少 TCP TIME_WAIT 状态**： 对于高并发短连接场景，大量连接处于 TIME_WAIT 状态会耗尽端口资源。
        ```bash
        # 启用 TIME_WAIT 复用
        sysctl -w net.ipv4.tcp_tw_reuse=1
        # 快速回收 TIME_WAIT 连接
        sysctl -w net.ipv4.tcp_tw_recycle=0 # 注意：在 NAT 环境下建议为 0，否则可能有问题
        # 增大 FIN_WAIT_2 状态的超时时间
        sysctl -w net.ipv4.tcp_fin_timeout=30
        ```

3.  **使用高性能磁盘**
    对于静态资源服务，使用 SSD 硬盘可以极大提升 IO 性能。

---

### 二、Nginx 配置优化

这是优化的核心，直接决定 Nginx 的行为。

1.  **工作进程与连接数**
    *   **`worker_processes auto；`**： 设置为 `auto`，让 Nginx 自动根据 CPU 核心数设置工作进程数，通常等于 CPU 核心数。
    *   **`worker_connections`**： 每个工作进程可以处理的最大连接数。它与 `worker_rlimit_nofile` 共同决定了 Nginx 的总并发能力。
        ```
        events {
            worker_connections 10240; # 例如，设置为 10240
            use epoll; # 在 Linux 上使用高性能的 epoll 事件模型
        }
        ```

2.  **高效静态资源服务**
    *   **启用 `sendfile`**： 绕过用户空间，直接在内核中完成文件数据传输，非常高效。
        ```
        sendfile on;
        ```
    *   **启用 `tcp_nopush`**： 与 `sendfile on` 一起使用，确保数据包被填满后再发送，提高网络效率。
        ```
        tcp_nopush on;
        ```
    *   **启用 `tcp_nodelay`**： 针对 keepalive 连接，强制立即发送数据，减少延迟。通常与 `tcp_nopush` 一起使用。
        ```
        tcp_nodelay on;
        ```

3.  **连接与请求超时**
    合理的超时设置可以释放闲置资源，避免连接被长期占用。
    ```
    # 客户端连接保持超时时间
    keepalive_timeout 30s;
    # 与上游服务器的保持连接超时时间
    proxy_connect_timeout 5s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
    # 客户端请求头读取超时
    client_header_timeout 15s;
    # 客户端请求体读取超时
    client_body_timeout 15s;
    ```

4.  **缓冲与缓存**
    *   **缓冲区优化**： 为客户端请求头和请求体设置合适的缓冲区大小，避免 Nginx 写入临时文件，降低 IO。
        ```
        client_header_buffer_size 1k;
        large_client_header_buffers 4 4k;
        client_body_buffer_size 128k;
        ```
    *   **代理缓冲区**： 当 Nginx 作为反向代理时，控制从上游服务器接收数据的缓冲区。
        ```
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        ```
    *   **启用缓存**：
        *   **静态资源缓存**： 使用 `expires` 或 `add_header` 指令为静态资源设置长时间的浏览器缓存。
            ```
            location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
            }
            ```
        *   **反向代理缓存**： 使用 `proxy_cache` 模块缓存上游服务器的动态内容，极大减轻后端压力。
            ```
            proxy_cache_path /path/to/cache levels=1:2 keys_zone=my_cache:10m max_size=10g inactive=60m;
            location / {
                proxy_cache my_cache;
                proxy_cache_valid 200 302 10m;
                proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
            }
            ```

5.  **日志优化**
    *   **禁用访问日志**： 对于极高并发且不关心访问日志的场景，可以关闭 `access_log`。
    *   **缓冲写入日志**： 使用 `buffer` 参数让 Nginx 先将日志写入内存缓冲区，满后再刷入磁盘。
        ```
        access_log /var/log/nginx/access.log main buffer=64k flush=1m;
        ```
    *   **记录关键信息**： 精简日志格式，只记录必要字段。

6.  **Gzip 压缩**
    对文本类型的响应进行压缩，减少网络传输量。
    ```
    gzip on;
    gzip_vary on;
    gzip_min_length 1024; # 小于此值不压缩
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    ```

7.  **上游连接保持**
    当代理到后端服务时，使用 `keepalive` 保持一定数量的空闲连接，避免频繁建立和断开 TCP 连接的开销。
    ```
    upstream backend_servers {
        server 10.0.1.100:8080;
        keepalive 32; # 保持的空闲连接数
    }

    location / {
        proxy_pass http://backend_servers;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }
    ```

---

### 三、架构与部署优化

1.  **负载均衡**
    使用 Nginx 的 `upstream` 模块将流量分发到多个后端服务器，实现水平扩展和高可用。
    ```
    upstream app_cluster {
        least_conn; # 使用最少连接算法
        server 10.0.1.101:8080;
        server 10.0.1.102:8080;
        server 10.0.1.103:8080;
    }
    ```

2.  **动静分离**
    将静态资源（图片、CSS、JS）的请求与动态请求分开。可以让 Nginx 直接处理静态资源，而动态请求则代理给后端应用服务器（如 Tomcat, Node.js 等）。

3.  **启用 HTTP/2**
    HTTP/2 提供了多路复用、头部压缩等特性，能显著提升页面加载速度。
    ```
    listen 443 ssl http2;
    ```

4.  **使用第三方模块**
    根据需求编译第三方模块，如：
    *   **OpenResty**： 基于 Nginx 和 LuaJIT，提供了强大的可编程能力。
    *   **ngx_brotli**： 使用 Brotli 压缩算法，通常比 Gzip 压缩率更高。

---

### 四、监控与调试

优化不是一次性的，需要持续监控。

1.  **启用状态模块**
    使用 `stub_status_module` 来查看 Nginx 的基本状态信息。
    ```
    location /nginx_status {
        stub_status;
        allow 127.0.0.1; # 只允许本机访问
        deny all;
    }
    ```
    访问后可以看到活跃连接数、请求总数等信息。

2.  **分析日志**
    使用工具如 `goaccess`、`awstats` 分析访问日志，了解流量模式和瓶颈。

3.  **性能剖析**
    在极端情况下，可以使用 `debug` 日志或系统工具（如 `perf`， `strace`）进行深度性能剖析。

### 总结与建议

1.  **循序渐进**： 不要一次性修改所有参数。一次只修改一两项，然后进行压测（如使用 `wrk`, `ab`, `jmeter`），观察效果。
2.  **监控先行**： 在优化前、中、后都要有可靠的监控数据作为依据。
3.  **理解业务**： 优化的策略很大程度上取决于业务类型。是高并发连接？是大文件下载？还是大量的短动态请求？
4.  **内核参数谨慎调整**： 生产环境调整内核参数前，务必在测试环境充分验证。

通过以上这些方式的组合运用，你可以显著提升 Nginx 的性能和稳定性，使其能够轻松应对百万级别的并发连接。