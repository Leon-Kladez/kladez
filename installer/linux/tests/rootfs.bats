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
