#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="application"

set +x
if [[ -z "${SUB2API_ADMIN_API_KEY:-}" ]]; then
  read -rsp 'Sub2API Admin API key: ' SUB2API_ADMIN_API_KEY
  printf '\n'
fi

if [[ ! "$SUB2API_ADMIN_API_KEY" =~ ^admin-[0-9a-f]{64}$ ]]; then
  printf 'Sub2API Admin API key has an unexpected format\n' >&2
  exit 1
fi

kubectl -n "$NAMESPACE" create secret generic sub2api-mcp \
  --from-literal=admin-api-key="$SUB2API_ADMIN_API_KEY" \
  --dry-run=client -o yaml | kubectl apply -f -

unset SUB2API_ADMIN_API_KEY
kubectl -n "$NAMESPACE" get secret sub2api-mcp -o json | \
  jq -r '.metadata.name + " keys=" + ((.data | keys) | join(" "))'
