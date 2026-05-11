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
    ssh-keyscan github.com >> "$HOME/.ssh/known_hosts" 2>/dev/null || true
fi

if [ -n "${GIT_USER_NAME:-}" ]; then
    git config --global user.name "${GIT_USER_NAME}"
fi
if [ -n "${GIT_USER_EMAIL:-}" ]; then
    git config --global user.email "${GIT_USER_EMAIL}"
fi

# 3. Set workspace from baked-in repo
WORKSPACE="${OPENCODE_WORKSPACE:-/app/repo-baked}"

# 4. Try to pull latest changes (best-effort, cluster may be offline)
if [ -d "$WORKSPACE/.git" ]; then
    cd "$WORKSPACE"
    git pull --rebase 2>/dev/null || true
fi

cd "$WORKSPACE"

echo "Starting opencode web from $(pwd) ..."
exec "$@"
