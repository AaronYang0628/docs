#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REGISTRY="crpi-wixjy6gci86ms14e.cn-hongkong.personal.cr.aliyuncs.com"
IMAGE_REPOSITORY="${REGISTRY}/ay-dev/opencode-agent"
IMAGE_TAG="${IMAGE_TAG:-1.18.2-20260716.4}"
IMAGE="${IMAGE_REPOSITORY}:${IMAGE_TAG}"
BUILD_PROXY="${BUILD_PROXY:-http://host.containers.internal:17890}"

podman build \
  --file "$ROOT_DIR/Dockerfile.opencode" \
  --tag "$IMAGE" \
  --build-arg "HTTP_PROXY=$BUILD_PROXY" \
  --build-arg "HTTPS_PROXY=$BUILD_PROXY" \
  "$ROOT_DIR"

podman push "$IMAGE"
printf 'Pushed %s\n' "$IMAGE"

if [[ "${IMPORT_TO_K3S:-true}" == "true" ]]; then
  archive="$(mktemp --suffix=.oci)"
  trap 'rm -f "$archive"' EXIT
  podman save --format oci-archive -o "$archive" "$IMAGE"
  sudo k3s ctr images import "$archive"
  printf 'Imported %s into local k3s containerd\n' "$IMAGE"
fi
