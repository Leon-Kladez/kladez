#!/usr/bin/env bash
# Build dist/kladez-rootfs.tar.gz (the Kladez WSL distro). Needs docker; runs in CI.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
dist="${KZ_DIST:-$here/../../dist}"
mkdir -p "$dist"
tag="kladez-rootfs:build"
docker build -f "$here/rootfs/Dockerfile" -t "$tag" "$here"
cid=$(docker create "$tag")
trap 'docker rm -f "$cid" >/dev/null' EXIT
docker export "$cid" | gzip -9 > "$dist/kladez-rootfs.tar.gz"
( cd "$dist" && sha256sum kladez-rootfs.tar.gz > kladez-rootfs.sha256 )
echo "built $dist/kladez-rootfs.tar.gz"
