+++
title = 'Deploy CSST Gateway'
date = 2024-03-12T15:00:59+08:00
weight = 64
+++

### Preliminary
- DFS server has installed though argo-workflow, if not [check link](csst/application/init_dfs_server/index.html)
- DFS ephem has installed though argo-workflow, if not [check link](csst/application/init_dfs_ephem/index.html)

{{% notice style="warning" %}}
if the **dfs server**, **dfs ephem** and **namespace** isn't match, you might need to modify following shell.
{{% /notice %}}

### Steps

#### 1. prepare `csst-gateway.configmap.yaml`
```yaml
worker_processes auto;

events {
  worker_connections 1024;
}

http {
  log_format  main  '$remote_addr - $remote_user [$time_local] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent" "$http_x_forwarded_for"';

  default_type  application/octet-stream;

  sendfile              on;
  tcp_nopush            on;
  tcp_nodelay           on;

  client_max_body_size  10000m;
  types_hash_max_size   2048;
  underscores_in_headers on;
  reset_timedout_connection on; 

  keepalive_timeout     960;
  client_header_timeout 960;
  client_body_timeout   960; 
  proxy_connect_timeout 960;
  proxy_read_timeout 960;
  proxy_send_timeout 960;
  send_timeout 960;

  upstream grpc_dfs {
    server dfs-server-nginx.application:9100 weight=1;
  }
  upstream grpc_ephem {
    server dfs-ephem-nginx.application:9060 weight=1;
  }

  server {
    listen 80 http2;
    location ^~ /dfs. {
      grpc_pass_header  Host;
      grpc_pass_header  X-Real-IP;
      grpc_set_header Host $host;
      grpc_set_header X-Real-IP $remote_addr;
      grpc_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      grpc_socket_keepalive on;
      grpc_read_timeout 960;
      grpc_send_timeout 960;
      proxy_read_timeout 960;
      proxy_send_timeout 960;
      grpc_pass grpc://grpc_dfs;
    }
    location ^~ /dfs.ephem. {
      grpc_pass_header  Host;
      grpc_pass_header  X-Real-IP;
      grpc_set_header Host $host;
      grpc_set_header X-Real-IP $remote_addr;
      grpc_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      grpc_socket_keepalive on;
      grpc_read_timeout 960;
      grpc_send_timeout 960;
      proxy_read_timeout 960;
      proxy_send_timeout 960;
      grpc_pass grpc://grpc_ephem;
    }
  }

  server {
    listen 81;
    location /search/v2 {
      proxy_pass        http://0.0.0.0:9068/search;
      proxy_pass_request_headers      on;
      proxy_set_header   Host $host;
      proxy_set_header   X-Real-IP $remote_addr;
      proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header   X-Forwarded-Host $server_name;
    }
    location / {
      root /share/dfs;
      autoindex on;
    }
  }
}

```

#### 2. [[Optional]]() prepare `csst-data-pvc.yaml`

```yaml
apiVersion: "v1"
kind: "PersistentVolumeClaim"
metadata:
  name: "csst-data-pvc"
  namespace: "application"
spec:
  accessModes:
  - "ReadWriteMany"
  resources:
    requests:
      storage: "200Gi"
  storageClassName: "nfs-external-nas"
status:
  accessModes:
  - "ReadWriteMany"
  capacity:
    storage: "200Gi"
```

#### 3. prepare `deploy-csst-gateway.yaml`
```yaml
---
apiVersion: v1
kind: Service
metadata:
  labels:
    app.kubernetes.io/name: csst-gateway
  name: csst-gateway
  namespace: application
spec:
  ports:
    - name: http
      port: 80
      nodePort: 31280
      protocol: TCP
      targetPort: 80
    - name: search
      port: 81
      nodePort: 31281
      targetPort: 81
  selector:
    app.kubernetes.io/name: csst-gateway
  type: NodePort
---
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app.kubernetes.io/name: csst-gateway
  name: csst-gateway
  namespace: application
spec:
  replicas: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: csst-gateway
  template:
    metadata:
      labels:
        app.kubernetes.io/name: csst-gateway
    spec:
      containers:
        - env:
            - name: TZ
              value: Asia/Shanghai
          image: docker.io/library/nginx:1.19.9-alpine
          imagePullPolicy: IfNotPresent
          name: csst-gateway
          ports:
            - containerPort: 80
              name: http
            - containerPort: 81
              name: search
          volumeMounts:
            - mountPath: /etc/nginx
              name: csst-gateway-config
            - mountPath: /share/dfs
              name: csst-data-pvc
      volumes:
        - name: csst-gateway-config
          configMap:
            name: csst-gateway-configmap
            items:
              - key: csst-gateway.configmap.yaml
                path: nginx.conf
        - name: csst-data-pvc
          persistentVolumeClaim:
            claimName: csst-data-pvc
      restartPolicy: Always
  
```

#### 4. create configMap based on `csst-gateway.configmap.yaml`
```shell
kubectl -n application create configmap csst-gateway-configmap --from-file=csst-gateway.configmap.yaml -o yaml --dry-run=client | kubectl -n application apply -f -
```

#### 5. [[Optional]]() create pvc resource
```shell
kubectl -n application apply -f csst-data-pvc.yaml
```

#### 6. apply to k8s
```shell
kubectl -n application apply -f deploy-csst-gateway.yaml
```
