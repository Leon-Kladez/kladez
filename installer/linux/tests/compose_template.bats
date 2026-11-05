#!/usr/bin/env bats
# compose.template.yaml: offline-only compose for Кладезъ (spec Б4–Б6, plan Task 2).

setup() {
  LINUX_DIR="$(cd "$BATS_TEST_DIRNAME/.." && pwd)"
  OUT="$BATS_TEST_TMPDIR/compose.yml"
  sed -e 's|@@LIBRARY_DIR@@|/mnt/d/Kladez/library|g' \
      -e 's|@@ADMIN_PORT@@|8080|g' -e 's|@@KIWIX_PORT@@|8090|g' \
      -e 's|@@APP_KEY@@|appkeyappkeyappkey|g' -e 's|@@DB_PASSWORD@@|dbpass|g' \
      -e 's|@@DB_ROOT_PASSWORD@@|rootpass|g' \
      -e 's|@@ADMIN_IMAGE@@|kladez-admin:test|g' -e 's|@@UPDATER_IMAGE@@|kladez-updater:test|g' \
      -e 's|@@DISK_COLLECTOR_IMAGE@@|kladez-disk:test|g' -e 's|@@MYSQL_IMAGE@@|mysql:8.0|g' \
      -e 's|@@REDIS_IMAGE@@|redis:7-alpine|g' -e 's|@@DOZZLE_IMAGE@@|amir20/dozzle:v10.0|g' \
      -e 's|@@REGISTRY_MIRRORS@@|https://mirror.gcr.io|g' -e 's|@@IMAGE_REPO@@|ghcr.io/leon-kladez/kladez|g' \
      "$LINUX_DIR/compose.template.yaml" > "$OUT"
}

services() { awk '/^services:/{s=1;next} /^[a-z]/{s=0} s && /^  [a-z-]+:$/' "$OUT" | tr -d ' :'; }

@test "no placeholder is left after substitution" {
  run grep -n '@@' "$OUT"
  [ "$status" -eq 1 ]
}

@test "nothing is ever pulled: no pull_policy always, every service pull_policy never" {
  run grep -n 'pull_policy: always' "$OUT"
  [ "$status" -eq 1 ]
  n_services=$(services | wc -l)
  n_never=$(grep -cE '^ +pull_policy: never$' "$OUT")
  [ "$n_services" -eq 6 ]
  [ "$n_never" -eq "$n_services" ]
}

@test "library path is identical in admin volume, NOMAD_STORAGE_PATH and disk-collector" {
  grep -q '"/mnt/d/Kladez/library:/app/storage"' "$OUT"
  grep -q '"NOMAD_STORAGE_PATH=/mnt/d/Kladez/library"' "$OUT"
  grep -q '"/mnt/d/Kladez/library:/storage"' "$OUT"
}

@test "admin port is published and URL is localhost, not a LAN IP" {
  grep -q '"8080:8080"' "$OUT"
  grep -q 'URL=http://localhost:8080' "$OUT"
  run grep -E 'URL=http://[0-9]+\.' "$OUT"
  [ "$status" -eq 1 ]
}

@test "mysql and redis data stay inside the distro, never on /mnt" {
  grep -q '/opt/project-nomad/mysql:/var/lib/mysql' "$OUT"
  grep -q '/opt/project-nomad/redis:/data' "$OUT"
  run grep -E '/mnt/.*:(/var/lib/mysql|/data)$' "$OUT"
  [ "$status" -eq 1 ]
}

@test "own registry and mirrors reach admin and updater" {
  grep -q 'KLADEZ_IMAGE_REPO=ghcr.io/leon-kladez/kladez' "$OUT"
  grep -q 'KLADEZ_REGISTRY_MIRRORS=https://mirror.gcr.io' "$OUT"
  grep -q 'ADMIN_IMAGE_REPO=ghcr.io/leon-kladez/kladez' "$OUT"
}

@test "images.lock: admin is the Кладезъ image, not NOMAD" {
  grep -qE '^admin ghcr.io/leon-kladez/kladez:[0-9]+[.][0-9]+[.][0-9]+@sha256:[0-9a-f]{64}$' "$LINUX_DIR/images.lock"
}

@test "images.lock: updater is built from this repo (its script knows our registry)" {
  grep -qE '^updater ghcr.io/leon-kladez/kladez-sidecar-updater:[0-9]+[.][0-9]+[.][0-9]+@sha256:[0-9a-f]{64}$' "$LINUX_DIR/images.lock"
}

@test "images.lock pins every bundled image by digest" {
  for key in admin updater disk_collector mysql redis dozzle kiwix; do
    grep -qE "^${key} [^ ]+@sha256:[0-9a-f]{64}$" "$LINUX_DIR/images.lock"
  done
}

@test "docker compose accepts the rendered file" {
  command -v docker >/dev/null || skip "docker not available here (runs in CI)"
  docker compose -f "$OUT" config -q
}
