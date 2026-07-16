#!/bin/sh
set -eu

WORKSPACE="${OPENCODE_WORKSPACE:-/workspace}"
SSH_SECRET_DIR="${OPENCODE_SSH_SECRET_DIR:-/run/secrets/opencode-ssh}"
GIT_CREDENTIALS_FILE="${OPENCODE_GIT_CREDENTIALS_FILE:-/run/secrets/opencode-git/.git-credentials}"

if [ ! -d "$WORKSPACE/.opencode" ]; then
    echo "Missing project configuration: $WORKSPACE/.opencode" >&2
    exit 1
fi

if [ -f "$SSH_SECRET_DIR/id_rsa" ]; then
    install -d -m 0700 "$HOME/.ssh"
    install -m 0600 "$SSH_SECRET_DIR/id_rsa" "$HOME/.ssh/id_rsa"
    if [ -f "$SSH_SECRET_DIR/known_hosts" ]; then
        install -m 0644 "$SSH_SECRET_DIR/known_hosts" "$HOME/.ssh/known_hosts"
    fi
fi

git config --global --add safe.directory "$WORKSPACE"

if [ -f "$GIT_CREDENTIALS_FILE" ]; then
    install -m 0600 "$GIT_CREDENTIALS_FILE" "$HOME/.git-credentials"
    git config --global credential.helper store
fi

if [ -n "${GIT_USER_NAME:-}" ]; then
    git config --global user.name "$GIT_USER_NAME"
fi
if [ -n "${GIT_USER_EMAIL:-}" ]; then
    git config --global user.email "$GIT_USER_EMAIL"
fi

if [ -z "${OPENAI_API_KEY:-}" ]; then
    echo "Warning: OPENAI_API_KEY is not set; model requests will fail" >&2
fi

cd "$WORKSPACE"
echo "Starting OpenCode from $WORKSPACE"
exec "$@"
