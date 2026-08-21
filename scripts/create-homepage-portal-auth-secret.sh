#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="${PORTAL_DATA_NAMESPACE:-monitor}"
SECRET_NAME="${PORTAL_DATA_SECRET_NAME:-portal-data-auth}"

if ! command -v kubectl >/dev/null 2>&1; then
  printf 'kubectl is required but not found in PATH\n' >&2
  exit 1
fi
if ! command -v python3 >/dev/null 2>&1; then
  printf 'python3 is required but not found in PATH\n' >&2
  exit 1
fi
if [[ -z "${PORTAL_DATA_SYNC_TOKEN:-}" ]]; then
  printf 'PORTAL_DATA_SYNC_TOKEN must be set; use the same value in both update-sg-ip environments\n' >&2
  exit 1
fi

read -r -s -p "Portal tools password: " password
printf '\n' >&2
read -r -s -p "Confirm password: " password_confirmation
printf '\n' >&2
if [[ -z "$password" || "$password" != "$password_confirmation" ]]; then
  printf 'Passwords are empty or do not match\n' >&2
  exit 1
fi

password_hash="$(PORTAL_PASSWORD="$password" python3 - <<'PY'
import base64
import hashlib
import os
import secrets

iterations = 600000
salt = secrets.token_bytes(16)
digest = hashlib.pbkdf2_hmac(
    "sha256", os.environ["PORTAL_PASSWORD"].encode("utf-8"), salt, iterations
)
encode = lambda value: base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")
print(f"pbkdf2_sha256${iterations}${encode(salt)}${encode(digest)}")
PY
)"

password_hash_b64="$(printf '%s' "$password_hash" | base64 -w0)"
sync_token_b64="$(printf '%s' "$PORTAL_DATA_SYNC_TOKEN" | base64 -w0)"
{
  printf 'apiVersion: v1\nkind: Secret\nmetadata:\n  name: %s\n  namespace: %s\ntype: Opaque\ndata:\n' "$SECRET_NAME" "$NAMESPACE"
  printf '  password-hash: %s\n' "$password_hash_b64"
  printf '  sync-token: %s\n' "$sync_token_b64"
} | kubectl apply -f -

printf 'Secret %s/%s updated\n' "$NAMESPACE" "$SECRET_NAME"
if kubectl -n "$NAMESPACE" get deployment portal-data >/dev/null 2>&1; then
  kubectl -n "$NAMESPACE" rollout restart deployment/portal-data
  kubectl -n "$NAMESPACE" rollout status deployment/portal-data --timeout=300s
fi
