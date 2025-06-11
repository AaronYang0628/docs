+++
title = 'Nginx'
date = 2024-03-07T15:00:59+08:00
weight = 4
+++


### 1. prepare `server.conf`
```yaml
cat << EOF > default.conf
server {
  listen 80;
  location / {
      root   /usr/share/nginx/html;
      autoindex on;
  }
}
EOF
```

### 2. install 
```shell
mkdir $(pwd)/data
podman run --rm -p 8080:80 \
    -v $(pwd)/data:/usr/share/nginx/html:ro \
    -v $(pwd)/default.conf:/etc/nginx/conf.d/default.conf:ro \
    -d docker.io/library/nginx:1.19.9-alpine
echo 'this is a test' > $(pwd)/data/some-data.txt

```

{{% notice style="tip" %}}
you can run an addinational **daocloud** image to accelerate your pulling, check [Daocloud Proxy](daocloud/index.html)
{{% /notice %}}


> visit http://localhost:8080