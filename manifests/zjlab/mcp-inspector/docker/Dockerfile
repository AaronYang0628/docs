# MCP Inspector + @modelcontextprotocol/server-everything, baked for offline
# in-cluster use on ZJLAB k3s (no runtime npm downloads).
#
# Build (from this directory):
#   docker build -t localhost/mcp-inspector:2.16.0-everything-2.3.1 .
#   docker save localhost/mcp-inspector:2.16.0-everything-2.3.1 \
#     | sudo k3s ctr -n k8s.io images import -
#
# node:24 pinned line: inspector engines ^22.23.4||^24.22.1||>=26.12.1,
# server-everything engines >=24. node:24-alpine is currently v24.22.x.
FROM m.daocloud.io/docker.io/library/node:24-alpine

ARG INSPECTOR_VERSION=2.16.0
ARG EVERYTHING_VERSION=2.3.1

# Neutralize any proxy env inherited from the builder shell: npm must go
# direct to the China mirror (127.0.0.1:7890 is unreachable from containers).
ENV HTTP_PROXY= \
    HTTPS_PROXY= \
    http_proxy= \
    https_proxy= \
    NO_PROXY="*" \
    no_proxy="*"

RUN npm config set registry https://registry.npmmirror.com \
    && npm install -g \
        "@modelcontextprotocol/inspector@${INSPECTOR_VERSION}" \
        "@modelcontextprotocol/server-everything@${EVERYTHING_VERSION}" \
    && npm cache clean --force

# The UI is served over plain HTTP on internal IPs (insecure context), where
# crypto.randomUUID does not exist; the page crashes on first connect.
# Patch in the standard getRandomValues-based polyfill. Idempotent.
COPY patch-insecure-context.mjs /tmp/patch-insecure-context.mjs
RUN node /tmp/patch-insecure-context.mjs

# Web UI/API server on CLIENT_PORT; MCP Apps sandbox + app-origin stay
# cluster-internal (not exposed via NodePort for now).
ENV HOST=0.0.0.0 \
    DANGEROUSLY_BIND_ALL_INTERFACES=true \
    CLIENT_PORT=6274 \
    MCP_SANDBOX_PORT=6275 \
    MCP_APP_ORIGIN_PORT=6278 \
    MCP_AUTO_OPEN_ENABLED=false \
    MCP_INSPECTOR_SECRET_STORE=file \
    MCP_STORAGE_DIR=/data \
    HOME=/data

RUN mkdir -p /data && chown node:node /data
VOLUME ["/data"]

USER node
EXPOSE 6274 6275 6278

# No image CMD: the deployment runs with no positional target so the server
# catalog (MCP_CATALOG_PATH) stays writable in the UI. K8s treats an empty
# args:[] as "unset", which would leak an image CMD back in — so none exists.
ENTRYPOINT ["mcp-inspector", "--web"]
