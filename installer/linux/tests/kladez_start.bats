#!/usr/bin/env bats
# kladez-start: runs Кладезъ inside the Kladez WSL distro (spec Б5, plan Task 3).

setup() {
  LINUX_DIR="$(cd "$BATS_TEST_DIRNAME/.." && pwd)"
  export PATH="$BATS_TEST_DIRNAME/stubs:$PATH"
  export STUB_LOG="$BATS_TEST_TMPDIR/calls.log" STUB_STATE="$BATS_TEST_TMPDIR/state"
  export KZ_ROOT="$BATS_TEST_TMPDIR/root" KZ_SLEEP_CMD=true KZ_DOCKERD_TIMEOUT=3 KZ_HEALTH_TIMEOUT=3
  mkdir -p "$STUB_STATE" "$KZ_ROOT/opt/project-nomad"
  : > "$STUB_LOG"
  cp "$LINUX_DIR/compose.template.yaml" "$LINUX_DIR/images.lock" "$KZ_ROOT/opt/project-nomad/"
  BUNDLE="$BATS_TEST_TMPDIR/kladez-images.tar.zst"; echo "fake-bundle" > "$BUNDLE"
  LIB="$BATS_TEST_TMPDIR/lib"
  START="$LINUX_DIR/kladez-start"
}

first_run() { "$START" --first-run --bundle "$BUNDLE" --library "${1:-$LIB}" --admin-port 8080 --kiwix-port 8090; }
line_of() { grep -n -m1 -- "$1" "$STUB_LOG" | cut -d: -f1; }

@test "first run: rshared, dockerd, load, compose up — in this order" {
  run first_run
  [ "$status" -eq 0 ]
  l_mount=$(line_of 'mount --make-rshared /')
  l_dockerd=$(line_of 'dockerd')
  l_load=$(line_of 'docker load')
  l_up=$(line_of 'docker compose .* up -d')
  [ -n "$l_mount" ] && [ -n "$l_dockerd" ] && [ -n "$l_load" ] && [ -n "$l_up" ]
  [ "$l_mount" -lt "$l_dockerd" ] && [ "$l_dockerd" -lt "$l_load" ] && [ "$l_load" -lt "$l_up" ]
  [ "$(cat "$STUB_STATE/loaded-images")" = "fake-bundle" ]
}

@test "first run never pulls anything" {
  run first_run
  [ "$status" -eq 0 ]
  run grep -E 'docker (compose .*)?pull' "$STUB_LOG"
  [ "$status" -eq 1 ]
}

@test "first run writes kladez.conf and a compose file without placeholders" {
  first_run
  grep -qx "LIBRARY_DIR=$LIB" "$KZ_ROOT/etc/kladez.conf"
  grep -qx 'ADMIN_PORT=8080' "$KZ_ROOT/etc/kladez.conf"
  grep -qx 'KIWIX_PORT=8090' "$KZ_ROOT/etc/kladez.conf"
  run grep '@@' "$KZ_ROOT/opt/project-nomad/compose.yml"
  [ "$status" -eq 1 ]
  grep -q 'image: ghcr.io/leon-kladez/kladez:0.1.0$' "$KZ_ROOT/opt/project-nomad/compose.yml"
  grep -q 'ADMIN_IMAGE_REPO=ghcr.io/leon-kladez/kladez$' "$KZ_ROOT/opt/project-nomad/compose.yml"
  [ -d "$LIB" ]
}

@test "second first-run keeps secrets and does not reload images" {
  first_run
  cp "$KZ_ROOT/opt/project-nomad/.secrets" "$BATS_TEST_TMPDIR/secrets.1"
  : > "$STUB_LOG"
  first_run
  cmp "$KZ_ROOT/opt/project-nomad/.secrets" "$BATS_TEST_TMPDIR/secrets.1"
  run grep 'docker load' "$STUB_LOG"
  [ "$status" -eq 1 ]
}

@test "upgrade reloads images and keeps passwords and ports" {
  "$START" --first-run --bundle "$BUNDLE" --library "$LIB" --admin-port 8180 --kiwix-port 8190
  pw=$(grep '^DB_PASSWORD=' "$KZ_ROOT/opt/project-nomad/.secrets")
  echo "new-bundle" > "$BUNDLE"; : > "$STUB_LOG"
  run "$START" --upgrade --bundle "$BUNDLE"
  [ "$status" -eq 0 ]
  [ "$(cat "$STUB_STATE/loaded-images")" = "new-bundle" ]
  grep -qx "$pw" "$KZ_ROOT/opt/project-nomad/.secrets"
  grep -q "DB_PASSWORD=${pw#DB_PASSWORD=}$" "$KZ_ROOT/opt/project-nomad/compose.yml"
  grep -q '"8180:8080"' "$KZ_ROOT/opt/project-nomad/compose.yml"
}

@test "dockerd is not started when docker already answers" {
  touch "$STUB_STATE/dockerd-running"
  first_run
  run grep '^dockerd' "$STUB_LOG"
  [ "$status" -eq 1 ]
}

@test "dockerd that never comes up fails with a Russian message" {
  export STUB_DOCKERD_BROKEN=1
  run first_run
  [ "$status" -eq 1 ]
  [[ "$output" == *"Не удалось запустить Docker"* ]]
}

@test "gpu: nvidia-smi present → nvidia marker; absent → no marker" {
  export STUB_NVIDIA_RC=0 KZ_NVIDIA_TOOLKIT=1
  first_run
  [ "$(cat "$LIB/.nomad-gpu-type")" = nvidia ]
  export STUB_NVIDIA_RC=1
  "$START" --upgrade --bundle "$BUNDLE"
  [ ! -e "$LIB/.nomad-gpu-type" ]
}

@test "gpu: nvidia without container toolkit writes no marker (CPU instead of a broken GPU start)" {
  export STUB_NVIDIA_RC=0 KZ_NVIDIA_TOOLKIT=
  first_run
  [ ! -e "$LIB/.nomad-gpu-type" ]
}

@test "library path with a space and Cyrillic survives into compose" {
  odd="$BATS_TEST_TMPDIR/Мои файлы/Kladez/library"
  first_run "$odd"
  grep -qF "\"$odd:/app/storage\"" "$KZ_ROOT/opt/project-nomad/compose.yml"
  grep -qF "\"NOMAD_STORAGE_PATH=$odd\"" "$KZ_ROOT/opt/project-nomad/compose.yml"
  [ -d "$odd" ]
}

@test "status: running / stopped" {
  first_run
  touch "$STUB_STATE/admin-running"
  run "$START" --status
  [ "$status" -eq 0 ] && [ "$output" = running ]
  rm "$STUB_STATE/admin-running"
  run "$START" --status
  [ "$status" -eq 1 ] && [ "$output" = stopped ]
}

@test "keepalive brings everything up and then sleeps" {
  first_run; : > "$STUB_LOG"
  export KZ_SLEEP_CMD="echo slept"
  run "$START" --keepalive
  [ "$status" -eq 0 ]
  grep -q 'mount --make-rshared /' "$STUB_LOG"
  grep -q 'docker compose .* up -d' "$STUB_LOG"
  [[ "$output" == *slept* ]]
}

@test "unknown option prints usage and fails" {
  run "$START" --bogus
  [ "$status" -eq 2 ]
}
