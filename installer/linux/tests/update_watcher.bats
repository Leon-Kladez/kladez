#!/usr/bin/env bats
# Updater sidecar: the admin image repo comes from ADMIN_IMAGE_REPO (Кладезъ own registry).

setup() {
  REPO_ROOT="$(cd "$BATS_TEST_DIRNAME/../../.." && pwd)"
  export UPDATE_WATCHER_LIB_ONLY=1
  export SHARED_DIR="$BATS_TEST_TMPDIR"
  COMPOSE="$BATS_TEST_TMPDIR/compose.yml"
  cat > "$COMPOSE" <<'YAML'
services:
  admin:
    image: ghcr.io/leon-kladez/kladez:1.0.0
  updater:
    image: ghcr.io/leon-kladez/kladez-sidecar-updater:1.0.0
YAML
}

@test "apply_image_tag rewrites the admin image of ADMIN_IMAGE_REPO only" {
  export ADMIN_IMAGE_REPO=ghcr.io/leon-kladez/kladez
  source "$REPO_ROOT/install/sidecar-updater/update-watcher.sh"
  apply_image_tag "$COMPOSE" 1.2.3
  grep -q 'image: ghcr.io/leon-kladez/kladez:1.2.3$' "$COMPOSE"
  grep -q 'image: ghcr.io/leon-kladez/kladez-sidecar-updater:1.0.0$' "$COMPOSE"
}

@test "apply_image_tag defaults to the Кладезъ registry" {
  unset ADMIN_IMAGE_REPO
  printf 'services:\n  admin:\n    image: ghcr.io/leon-kladez/kladez:0.1.0\n' > "$COMPOSE"
  source "$REPO_ROOT/install/sidecar-updater/update-watcher.sh"
  apply_image_tag "$COMPOSE" 0.2.0
  grep -q 'image: ghcr.io/leon-kladez/kladez:0.2.0$' "$COMPOSE"
}

@test "apply_image_tag fails when the repo is not in the compose file" {
  export ADMIN_IMAGE_REPO=ghcr.io/someone/else
  source "$REPO_ROOT/install/sidecar-updater/update-watcher.sh"
  run apply_image_tag "$COMPOSE" 1.2.3
  [ "$status" -ne 0 ]
}
