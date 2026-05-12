#!/usr/bin/env bash
set -euo pipefail

HOMEPAGE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../manifests/homepage" && pwd)"
CONFIG_DIR="${HOMEPAGE_DIR}/config"
OUTPUT_FILE="${HOMEPAGE_DIR}/configmap.yaml"

if ! command -v kubectl >/dev/null 2>&1; then
  echo "kubectl is required but not found in PATH" >&2
  exit 1
fi

if [[ ! -d "${CONFIG_DIR}" ]]; then
  echo "config directory not found: ${CONFIG_DIR}" >&2
  exit 1
fi

required_files=(
  bookmarks.yaml
  custom.css
  custom.js
  docker.yaml
  kubernetes.yaml
  services.yaml
  settings.yaml
  widgets.yaml
)

for file in "${required_files[@]}"; do
  if [[ ! -f "${CONFIG_DIR}/${file}" ]]; then
    echo "missing required config file: ${CONFIG_DIR}/${file}" >&2
    exit 1
  fi
done

kubectl create configmap homepage \
  --from-file="${CONFIG_DIR}/bookmarks.yaml" \
  --from-file="${CONFIG_DIR}/custom.css" \
  --from-file="${CONFIG_DIR}/custom.js" \
  --from-file="${CONFIG_DIR}/docker.yaml" \
  --from-file="${CONFIG_DIR}/kubernetes.yaml" \
  --from-file="${CONFIG_DIR}/services.yaml" \
  --from-file="${CONFIG_DIR}/settings.yaml" \
  --from-file="${CONFIG_DIR}/widgets.yaml" \
  --dry-run=client -o yaml > "${OUTPUT_FILE}"

echo "configmap generated: ${OUTPUT_FILE}"
