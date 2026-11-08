#!/usr/bin/env bash
# Kladez: smoke test of the admin image — native modules load, PDF tools are there,
# and the server boots against MySQL + Redis and serves the main pages.
# Usage: smoke-admin-image.sh <image>
set -euo pipefail
IMAGE="${1:?usage: smoke-admin-image.sh <image>}"
NET=kz-smoke
PASS=smoke-pass-123

cleanup() { docker rm -f kz-admin kz-mysql kz-redis >/dev/null 2>&1 || true; docker network rm "$NET" >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo "== image size"
docker image inspect -f '{{.Size}}' "$IMAGE" | awk '{ printf "%.0f MB\n", $1/1024/1024 }'

echo "== native modules and tools"
docker run --rm --entrypoint sh "$IMAGE" -c '
  set -e
  cd /app
  node -e "require(\"sharp\"); console.log(\"sharp ok\")"
  node -e "require(\"better-sqlite3\"); console.log(\"better-sqlite3 ok\")"
  node --input-type=module -e "await import(\"@openzim/libzim\"); console.log(\"libzim ok\")"
  node --input-type=module -e "await import(\"tesseract.js\"); console.log(\"tesseract ok\")"
  node --input-type=module -e "await import(\"pdf2pic\"); console.log(\"pdf2pic ok\")"
  gm version | head -1
  gs --version
  pmtiles version | head -1
  lspci --version
  test -s /app/resources/scalar/standalone.js && echo "scalar bundle ok"
  du -sh /app/node_modules
'

echo "== boot with MySQL + Redis"
docker network create "$NET" >/dev/null
docker run -d --name kz-mysql --network "$NET" --network-alias mysql \
  -e MYSQL_ROOT_PASSWORD="$PASS" -e MYSQL_DATABASE=nomad -e MYSQL_USER=nomad_user -e MYSQL_PASSWORD="$PASS" \
  mysql:8.0 >/dev/null
docker run -d --name kz-redis --network "$NET" --network-alias redis redis:7-alpine >/dev/null
for i in $(seq 1 60); do
  docker exec kz-mysql mysqladmin ping -h 127.0.0.1 -uroot -p"$PASS" --silent >/dev/null 2>&1 && break
  sleep 2
done
docker run -d --name kz-admin --network "$NET" -p 18080:8080 \
  -e NODE_ENV=production -e PORT=8080 -e HOST=0.0.0.0 -e LOG_LEVEL=info \
  -e APP_KEY=smoke-test-app-key-0123456789abcdef -e URL=http://localhost:18080 \
  -e DB_HOST=mysql -e DB_PORT=3306 -e DB_DATABASE=nomad -e DB_USER=nomad_user -e DB_PASSWORD="$PASS" -e DB_SSL=false \
  -e REDIS_HOST=redis -e REDIS_PORT=6379 -e NOMAD_STORAGE_PATH=/app/storage \
  "$IMAGE" >/dev/null

ok=0
for i in $(seq 1 90); do
  if curl -fsS http://localhost:18080/api/health >/dev/null 2>&1; then ok=1; break; fi
  sleep 2
done
if [ "$ok" != 1 ]; then
  echo "server did not become healthy"; docker logs kz-admin 2>&1 | tail -80; exit 1
fi

fail=0
for path in /home /library /maps /about /docs/home /settings/system /settings/zim /settings/maps \
            /settings/zim/remote-explorer /settings/support /settings/legal /settings/update \
            /settings/benchmark /settings/advanced /settings/phones /supply-depot /easy-setup \
            /reference /reference/assets/standalone.js /api/openapi.json; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:18080$path")
  echo "$code $path"
  case "$code" in 200|302) ;; *) fail=1 ;; esac
done
if [ "$fail" != 0 ]; then docker logs kz-admin 2>&1 | tail -80; exit 1; fi
if docker logs kz-admin 2>&1 | grep -E "Cannot find (module|package)|ERR_MODULE_NOT_FOUND"; then
  echo "missing module in server log"; exit 1
fi
echo "smoke test passed"
