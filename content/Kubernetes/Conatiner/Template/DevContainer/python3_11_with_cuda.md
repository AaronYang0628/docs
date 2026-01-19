+++
title = 'Python 3.11 + CUDA 120'
date = 2024-03-07T15:00:59+08:00
weight = 100
+++

### prepare `.devcontainer.json`
```json
{
	"name": "DALI Learning Environment",
	"build": {
		"dockerfile": "Dockerfile",
		"context": "..",
		"args": {
			"VARIANT": "3.11",
			"HTTP_PROXY": "",
			"HTTPS_PROXY": "",
			"http_proxy": "",
			"https_proxy": ""
		}
	},
	"forwardPorts": [8000],
	"portsAttributes": {
		"8000": {
			"label": "HTTP Server",
			"protocol": "http",
			"onAutoForward": "notify"
		}
	},
	"customizations": {
		"vscode": {
			"extensions": [
				"ms-python.python",
				"ms-python.vscode-pylance",
				"ms-python.debugpy"
			],
			"settings": {
				"python.defaultInterpreterPath": "/usr/bin/python",
				"files.exclude": {
					"**/__pycache__": true,
					"**/*.pyc": true
				}
			}
		}
	},
	"postCreateCommand": "bash .devcontainer/post-create.sh",
	"remoteUser": "vscode",
	"runArgs": [
		"-p", "0.0.0.0:8000:8000", 
		"--device=/dev/nvidiactl",
		"--device=/dev/nvidia0",
		"--device=/dev/nvidia-uvm",
		"--device=/dev/nvidia-uvm-tools",
		"--ipc=host",
		"--ulimit", "memlock=-1",
		"--ulimit", "stack=67108864",
		"--env", "LD_LIBRARY_PATH=/usr/local/cuda/lib64:/usr/lib/x86_64-linux-gnu:/host/usr/lib/x86_64-linux-gnu"
	],
	"mounts": [
		"type=bind,src=${localEnv:HOME}/.ssh,target=/home/vscode/.ssh,readonly",
		"type=bind,src=/usr/lib/x86_64-linux-gnu,target=/host/usr/lib/x86_64-linux-gnu,readonly",
		"type=bind,src=/usr/bin/nvidia-smi,target=/usr/bin/nvidia-smi,readonly",
		"type=bind,src=/usr/bin/nvidia-debugdump,target=/usr/bin/nvidia-debugdump,readonly"
	],
	"containerEnv": {
		"CUDA_VISIBLE_DEVICES": "0",
		"NVIDIA_VISIBLE_DEVICES": "all",
		"NVIDIA_DRIVER_CAPABILITIES": "compute,utility",
		"HTTP_PROXY": "",
		"HTTPS_PROXY": "",
		"http_proxy": "",
		"https_proxy": "",
		"NO_PROXY": "",
		"no_proxy": ""
	},
	"description": "NVIDIA DALI MCP开发环境 - GPU支持的轻量级镜像"
}
```


### prepare `Dockerfile`
```dockerfile
# Use runtime image instead of devel to reduce size (4GB vs 10GB)
FROM m.daocloud.io/docker.io/nvidia/cuda:12.1.0-cudnn8-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Asia/Shanghai

# Add deadsnakes PPA for Python 3.11 and install base dependencies
# Clear proxy settings to avoid connection issues during build
RUN unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy && \
    apt-get update && apt-get install -y --no-install-recommends \
    software-properties-common \
    curl \
    && add-apt-repository ppa:deadsnakes/ppa -y && \
    apt-get update && apt-get install -y --no-install-recommends \
    python3.11 \
    python3.11-dev \
    python3.11-distutils \
    python3-pip \
    git \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js (LTS) for Claude CLI
RUN unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy && \
    curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    rm -rf /var/lib/apt/lists/*

# Set NVIDIA library paths
ENV LD_LIBRARY_PATH=/usr/local/cuda/lib64:${LD_LIBRARY_PATH}
ENV CUDA_HOME=/usr/local/cuda
ENV PATH=${CUDA_HOME}/bin:${PATH}
ENV NVIDIA_VISIBLE_DEVICES=all
ENV NVIDIA_DRIVER_CAPABILITIES=compute,utility

# Set Python 3.11 as default version
RUN unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy && \
    update-alternatives --install /usr/bin/python python /usr/bin/python3.11 1 && \
    update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1

# Upgrade pip
RUN unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy && \
    python -m pip install --no-cache-dir --upgrade pip setuptools wheel

# Install DALI and minimal packages for MCP development
RUN unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy && \
    pip install --no-cache-dir \
    --extra-index-url https://pypi.nvidia.com \
    nvidia-dali-cuda120 \
    numpy \
    ipython

# Create non-root user
RUN useradd -m -s /bin/bash vscode && \
    mkdir -p /workspace && \
    chown -R vscode:vscode /workspace

WORKDIR /workspace
USER vscode

CMD ["/bin/bash"]

```

### post-create.sh
```shell
#!/bin/bash

# Clear proxy settings (should already be cleared by containerEnv, but double-check)
unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy

# Install MCP SDK and minimal dependencies
pip install --no-cache-dir \
    -i https://pypi.tuna.tsinghua.edu.cn/simple \
    mcp \
    anthropic

curl -fsSL https://claude.ai/install.sh | bash

echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc && source ~/.bashrc

# Create working directories
mkdir -p /workspace/scripts

echo "✅ DALI  environment setup completed!"
```