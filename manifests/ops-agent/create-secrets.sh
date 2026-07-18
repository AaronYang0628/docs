#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="application"
SSH_KEY="${OPENCODE_SSH_KEY:-$HOME/.ssh/id_rsa}"
SSH_KNOWN_HOSTS="${OPENCODE_SSH_KNOWN_HOSTS:-$HOME/.ssh/known_hosts}"
SSH_CONFIG="${OPENCODE_SSH_CONFIG:-$HOME/.ssh/config}"
SSH_PRIVATE_CONFIG="${OPENCODE_SSH_PRIVATE_CONFIG:-$HOME/.ssh/config.d/zjlab.conf}"
GIT_CREDENTIALS="${OPENCODE_GIT_CREDENTIALS:-$HOME/.git-credentials}"
REGISTRY_SECRET_NAMESPACE="${REGISTRY_SECRET_NAMESPACE:-default}"

if [[ -z "${OPENAI_API_KEY:-}" ]]; then
  printf 'OPENAI_API_KEY must be set in the current environment\n' >&2
  exit 1
fi

if [[ ! -r "$SSH_KEY" ]]; then
  printf 'SSH key is not readable: %s\n' "$SSH_KEY" >&2
  exit 1
fi

if ! kubectl -n "$NAMESPACE" get secret opencode-basic-auth >/dev/null 2>&1; then
  password="$(openssl rand -hex 16)"
  password_hash="$(openssl passwd -apr1 "$password")"
  kubectl -n "$NAMESPACE" create secret generic opencode-basic-auth \
    --from-literal="auth=aaron:$password_hash" \
    --from-literal="password=$password"
fi

ssh_secret_args=(--from-file=id_rsa="$SSH_KEY")

if [[ -r "$SSH_KNOWN_HOSTS" ]]; then
  ssh_secret_args+=(--from-file=known_hosts="$SSH_KNOWN_HOSTS")
fi
if [[ -r "$SSH_CONFIG" ]]; then
  ssh_secret_args+=(--from-file=config="$SSH_CONFIG")
fi
if [[ -r "$SSH_PRIVATE_CONFIG" ]]; then
  ssh_secret_args+=(--from-file=zjlab.conf="$SSH_PRIVATE_CONFIG")
fi

kubectl -n "$NAMESPACE" create secret generic opencode-model \
  --from-literal=api-key="$OPENAI_API_KEY" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl -n "$NAMESPACE" create secret generic opencode-ssh \
  "${ssh_secret_args[@]}" \
  --dry-run=client -o yaml | kubectl apply -f -

if [[ -r "$GIT_CREDENTIALS" ]]; then
  kubectl -n "$NAMESPACE" create secret generic opencode-git-credentials \
    --from-file=.git-credentials="$GIT_CREDENTIALS" \
    --dry-run=client -o yaml | kubectl apply -f -
else
  printf 'Git credential store not found; Git push from the Pod will be unavailable\n' >&2
fi

if [[ -n "${ARGOCD_AUTH_TOKEN:-}" ]]; then
  kubectl -n "$NAMESPACE" create secret generic opencode-argocd \
    --from-literal=auth-token="$ARGOCD_AUTH_TOKEN" \
    --dry-run=client -o yaml | kubectl apply -f -
fi

kubectl -n "$REGISTRY_SECRET_NAMESPACE" get secret aliyun-registry -o json | \
  jq --arg namespace "$NAMESPACE" \
    'del(.metadata.uid,.metadata.resourceVersion,.metadata.creationTimestamp,.metadata.managedFields) |
     .metadata.namespace=$namespace' | \
  kubectl apply -f -
