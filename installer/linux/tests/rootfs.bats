#!/usr/bin/env bats
# Kladez distro rootfs and image bundle (spec Б5, plan Task 4). Needs docker → runs in CI.

setup() {
  LINUX_DIR="$(cd "$BATS_TEST_DIRNAME/.." && pwd)"
  DIST="${KZ_DIST:-$LINUX_DIR/../../dist}"
}

@test "wsl.conf has exactly the agreed keys and no systemd/boot" {
  f="$LINUX_DIR/rootfs/wsl.conf"
  grep -qx 'options = "metadata"' "$f"
  grep -qx 'appendWindowsPath = false' "$f"
  grep -qx 'hostname = kladez' "$f"
  grep -qx 'default = root' "$f"
  run bash -c "grep -vE '^[[:space:]]*#' '$f' | grep -nE 'systemd|^\[boot\]'"
  [ "$status" -eq 1 ]
}

@test "daemon.json lists the three mirrors in order and the local log driver" {
  f="$LINUX_DIR/rootfs/daemon.json"
  node -e '
    const j = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
    const want = ["https://mirror.gcr.io","https://dh-mirror.gitverse.ru","https://dockerhub.timeweb.cloud"];
    if (JSON.stringify(j["registry-mirrors"]) !== JSON.stringify(want)) process.exit(1);
    if (j["log-driver"] !== "local") process.exit(2);
  ' "$f"
}

@test "rootfs archive contains docker, compose, zstd and Кладезъ files, and is small" {
  [ -f "$DIST/kladez-rootfs.tar.gz" ] || skip "rootfs not built here (CI builds it with docker)"
  list="$BATS_TEST_TMPDIR/list"
  tar -tzf "$DIST/kladez-rootfs.tar.gz" > "$list"
  for p in usr/bin/dockerd usr/libexec/docker/cli-plugins/docker-compose usr/bin/zstd \
           usr/local/bin/kladez-start usr/local/lib/kladez/kladez-lib.sh \
           opt/project-nomad/compose.template.yaml opt/project-nomad/images.lock \
           etc/wsl.conf etc/docker/daemon.json; do
    grep -qE "^(\./)?$p$" "$list" || { echo "missing $p"; false; }
  done
  run grep -E '^(\./)?var/lib/apt/lists/.+' "$list"
  [ "$status" -eq 1 ]
  size=$(stat -c %s "$DIST/kladez-rootfs.tar.gz")
  [ "$size" -lt $((250 * 1024 * 1024)) ]
}

@test "image bundle holds every image from images.lock, tagged without digest" {
  [ -f "$DIST/kladez-images.tar.zst" ] || skip "bundle not built here (CI builds it with docker)"
  manifest=$(zstd -dc "$DIST/kladez-images.tar.zst" | tar -xO manifest.json)
  while read -r key ref; do
    tag="${ref%@sha256:*}"
    [[ "$manifest" == *"\"$tag\""* ]] || { echo "missing $key $tag"; false; }
  done < "$LINUX_DIR/images.lock"
}

# --- build-images-bundle.sh with a fake docker (no network, no daemon) ---
bundle_stub() {
  S="$BATS_TEST_TMPDIR/bin"; mkdir -p "$S"
  export LOG="$BATS_TEST_TMPDIR/docker.log" STATE="$BATS_TEST_TMPDIR/images"; mkdir -p "$STATE"; : > "$LOG"
  cat > "$S/docker" <<'STUB'
#!/usr/bin/env bash
echo "docker $*" >> "$LOG"
key() { printf '%s' "$1" | tr '/:@' '___'; }
case "$1" in
  pull) [[ "$2" == registry-blocked* || "$2" == redis* ]] && exit 1; echo "${2#*@}" > "$STATE/$(key "$2")" ;;
  image) f="$STATE/$(key "${@: -1}")"; [ -f "$f" ] && cat "$f" || exit 1 ;;
  tag) f="$STATE/$(key "$2")"; [ -f "$f" ] || exit 1; cp "$f" "$STATE/$(key "$3")" ;;
  save) echo "saved $*" ;;
esac
STUB
  cat > "$S/zstd" <<'STUB'
#!/usr/bin/env bash
for a; do case "$a" in -o) out=1 ;; *) [ -n "${out:-}" ] && { cat > "$a"; out=; } ;; esac; done
exit 0
STUB
  chmod +x "$S/docker" "$S/zstd"
  export PATH="$S:$PATH" KZ_DIST="$BATS_TEST_TMPDIR/dist"
}

@test "bundle: locally built admin is used without pulling" {
  bundle_stub
  d=sha256:$(printf 'a%.0s' {1..64})
  echo "$d" > "$STATE/ghcr.io_leon-kladez_kladez_1.0.0"
  echo "admin ghcr.io/leon-kladez/kladez:1.0.0@$d" > "$BATS_TEST_TMPDIR/lock"
  run "$LINUX_DIR/build-images-bundle.sh" "$BATS_TEST_TMPDIR/lock"
  [ "$status" -eq 0 ]
  run grep 'docker pull' "$LOG"
  [ "$status" -eq 1 ]
  grep -q 'docker save ghcr.io/leon-kladez/kladez:1.0.0' "$LOG"
}

@test "bundle: Docker Hub refusal falls back to a mirror and tags without digest" {
  bundle_stub
  d=sha256:$(printf 'b%.0s' {1..64})
  echo "redis redis:7-alpine@$d" > "$BATS_TEST_TMPDIR/lock"
  run "$LINUX_DIR/build-images-bundle.sh" "$BATS_TEST_TMPDIR/lock"
  [ "$status" -eq 0 ]
  grep -q "docker pull mirror.gcr.io/library/redis@$d" "$LOG"
  grep -q "docker tag mirror.gcr.io/library/redis@$d redis:7-alpine" "$LOG"
  grep -q 'docker save redis:7-alpine' "$LOG"
}
