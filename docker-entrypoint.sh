#!/bin/sh
set -euo pipefail

# ------------------------------------------------------------------
# opencode web docker entrypoint
# ------------------------------------------------------------------

# 1. Setup AI provider credentials
if [ -n "${DEEPSEEK_API_KEY:-}" ]; then
    mkdir -p "$HOME/.local/share/opencode"
    cat > "$HOME/.local/share/opencode/auth.json" <<EOF
{
  "deepseek": {
    "type": "api",
    "key": "${DEEPSEEK_API_KEY}"
  }
}
EOF
fi

# 2. Setup git SSH key for doc agent
if [ -n "${GIT_SSH_KEY:-}" ]; then
    mkdir -p "$HOME/.ssh"
    printf '%s\n' "$GIT_SSH_KEY" > "$HOME/.ssh/id_ed25519"
    chmod 600 "$HOME/.ssh/id_ed25519"
    # Add GitHub to known_hosts to avoid interactive prompt
    ssh-keyscan github.com >> "$HOME/.ssh/known_hosts" 2>/dev/null || true
fi

if [ -n "${GIT_USER_NAME:-}" ]; then
    git config --global user.name "${GIT_USER_NAME}"
fi
if [ -n "${GIT_USER_EMAIL:-}" ]; then
    git config --global user.email "${GIT_USER_EMAIL}"
fi

# 3. Ensure workspace exists
WORKSPACE="${OPENCODE_WORKSPACE:-/workspace}"
mkdir -p "$WORKSPACE"

# 4. If workspace is empty and REPO_URL is set, clone the repo
if [ -n "${REPO_URL:-}" ] && [ -z "$(ls -A "$WORKSPACE" 2>/dev/null)" ]; then
    echo "Cloning ${REPO_URL} into ${WORKSPACE} ..."
    git clone --depth 1 --branch "${REPO_BRANCH:-main}" "${REPO_URL}" "$WORKSPACE"
    cd "$WORKSPACE"
    git submodule sync || true
    git submodule update --init --depth 1 || true
fi

cd "$WORKSPACE"

echo "Starting opencode web from $(pwd) ..."
exec "$@"
