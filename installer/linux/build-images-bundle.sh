#!/usr/bin/env bash
# Build dist/kladez-images.tar.zst: every image from images.lock, pulled by digest and
# re-tagged without the digest (that is the name compose and the admin look for).
# Needs docker; runs in CI. Falls back to Docker Hub mirrors if Docker Hub refuses.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
dist="${KZ_DIST:-$here/../../dist}"
lock="${1:-$here/images.lock}"
mirrors=(mirror.gcr.io dh-mirror.gitverse.ru dockerhub.timeweb.cloud)
mkdir -p "$dist"

pull_with_fallback() {
    local ref="$1" name="${1%%@*}" digest="${1#*@}" m
    docker pull "$ref" && return 0
    case "$name" in */*.*/*|*.*/*) return 1 ;; esac   # not a Docker Hub image
    [[ "$name" == */* ]] || name="library/$name"
    for m in "${mirrors[@]}"; do
        if docker pull "$m/${name%:*}@$digest"; then
            docker tag "$m/${name%:*}@$digest" "$ref" 2>/dev/null || true
            return 0
        fi
    done
    return 1
}

tags=()
while read -r key ref; do
    [ -n "$key" ] || continue
    tag="${ref%@sha256:*}"
    pull_with_fallback "$ref" || { echo "cannot pull $key ($ref)" >&2; exit 1; }
    id=$(docker image inspect -f '{{.Id}}' "$ref" 2>/dev/null || docker image inspect -f '{{.Id}}' "${tag%:*}@${ref#*@}")
    docker tag "$id" "$tag"
    tags+=("$tag")
done < "$lock"

docker save "${tags[@]}" | zstd -19 -T0 -o "$dist/kladez-images.tar.zst" -f
( cd "$dist" && sha256sum kladez-images.tar.zst > kladez-images.sha256 )
echo "bundled ${#tags[@]} images into $dist/kladez-images.tar.zst"
