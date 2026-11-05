#!/usr/bin/env bash
# Build dist/kladez-images.tar.zst: every image from images.lock, re-tagged without the digest
# (that is the name compose and the admin look for). Needs docker; runs in CI.
#
# An image already present locally with exactly the pinned id (the admin image built in the same
# CI job) is used as is. Others are pulled by digest; Docker Hub images fall back to mirrors.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
dist="${KZ_DIST:-$here/../../dist}"
lock="${1:-$here/images.lock}"
mirrors=(mirror.gcr.io dh-mirror.gitverse.ru dockerhub.timeweb.cloud)
mkdir -p "$dist"

is_docker_hub() {
    local first="${1%%/*}"
    [[ "$1" != */* ]] || [[ "$first" != *.* && "$first" != *:* && "$first" != localhost ]]
}

# resolve <ref "name:tag@sha256:…">: make "name:tag" exist locally with that content.
resolve() {
    local ref="$1" tag="${1%@sha256:*}" digest="${1#*@}" name repo m
    if [ "$(docker image inspect -f '{{.Id}}' "$tag" 2>/dev/null || true)" = "$digest" ]; then
        return 0
    fi
    if docker pull "$ref"; then
        docker tag "$ref" "$tag"
        return 0
    fi
    is_docker_hub "$tag" || return 1
    name="${tag%:*}"
    [[ "$name" == */* ]] && repo="$name" || repo="library/$name"
    for m in "${mirrors[@]}"; do
        if docker pull "$m/$repo@$digest"; then
            docker tag "$m/$repo@$digest" "$tag"
            return 0
        fi
    done
    return 1
}

tags=()
while read -r key ref; do
    [ -n "$key" ] || continue
    resolve "$ref" || { echo "cannot get $key ($ref)" >&2; exit 1; }
    tags+=("${ref%@sha256:*}")
done < "$lock"

docker save "${tags[@]}" | zstd -19 -T0 -o "$dist/kladez-images.tar.zst" -f
( cd "$dist" && sha256sum kladez-images.tar.zst > kladez-images.sha256 )
echo "bundled ${#tags[@]} images into $dist/kladez-images.tar.zst"
