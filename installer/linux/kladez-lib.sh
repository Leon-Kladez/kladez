#!/usr/bin/env bash
# «Кладезъ»: functions used by kladez-start inside the Kladez WSL distro (spec Б5).
#
# Works without systemd and without [boot] in wsl.conf, so the same code runs on the
# modern WSL package and on the legacy in-box WSL of Windows 10 2004–21H1.
# KZ_ROOT prefixes every absolute path (tests point it at a temp dir; empty in the distro).

KZ_ROOT="${KZ_ROOT:-}"
KZ_CONF="$KZ_ROOT/etc/kladez.conf"
KZ_HOME="$KZ_ROOT/opt/project-nomad"
KZ_LOG_DIR="$KZ_ROOT/var/log"
KZ_COMPOSE="$KZ_HOME/compose.yml"
KZ_SECRETS="$KZ_HOME/.secrets"
KZ_FIRST_RUN_MARKER="$KZ_HOME/.first-run-done"
KZ_PROJECT="project-nomad"
KZ_DEFAULT_MIRRORS="https://mirror.gcr.io,https://dh-mirror.gitverse.ru,https://dockerhub.timeweb.cloud"

kz_log() {
    mkdir -p "$KZ_LOG_DIR"
    printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "$KZ_LOG_DIR/kladez-start.log"
}

kz_die() {
    kz_log "ОШИБКА: $*"
    echo "$*" >&2
    exit 1
}

# The disk-collector mounts / with rslave propagation; WSL's root is private by default.
kz_make_rshared() {
    mount --make-rshared / || kz_log "mount --make-rshared / failed (disk info may be incomplete)"
}

kz_ensure_dockerd() {
    local timeout="${1:-${KZ_DOCKERD_TIMEOUT:-60}}" i
    docker info >/dev/null 2>&1 && return 0
    kz_log "starting dockerd"
    mkdir -p "$KZ_LOG_DIR"
    # Own session (setsid), not just nohup: when the wsl.exe call that started us ends, the session's
    # SIGHUP made dockerd reload and killed its docker-proxy children, so Windows lost localhost:8080.
    setsid -f dockerd >> "$KZ_LOG_DIR/dockerd.log" 2>&1 < /dev/null
    for ((i = 0; i < timeout; i++)); do
        docker info >/dev/null 2>&1 && return 0
        sleep 1
    done
    kz_die "Не удалось запустить Docker внутри «Кладезъ». Перезагрузите компьютер и попробуйте ещё раз."
}

# A build that missed the real image list has zero digests (the placeholder from git, 0.1.0):
# compose would then name images that the bundle does not contain («No such image: …:0.1.0»).
# Checked before anything is loaded or recreated, so the running version stays untouched.
kz_check_lock() {
    local lock="$KZ_HOME/images.lock"
    [ -f "$lock" ] || kz_die "Не найден список программ «Кладезъ» ($lock). Скачайте установщик заново."
    if grep -qE '@sha256:0{64}' "$lock"; then
        kz_die "Установщик собран с ошибкой: в списке программ нет настоящих версий. Ничего не изменено — ваши книги и настройки целы. Скачайте установщик заново или отправьте помощнику файл журнала."
    fi
}

# "service image" of admin and updater in a compose file, e.g. "admin ghcr.io/…:0.1.6" (empty when no file).
kz_compose_images() {
    [ -f "$1" ] || return 0
    awk '/^  [A-Za-z_]+:$/ { svc = $1; sub(":", "", svc) } /^    image:/ && (svc == "admin" || svc == "updater") { print svc, $2 }' "$1"
}

# A new version of admin/updater: remove their old containers first, so compose creates them from
# the new images instead of depending on how the old ones (and their old tags) were set up.
kz_recreate_changed() {
    local before="$1" after
    after=$(kz_compose_images "$KZ_COMPOSE")
    [ "$before" = "$after" ] && return 0
    kz_log "new versions: removing old admin/updater containers"
    docker compose -p "$KZ_PROJECT" -f "$KZ_COMPOSE" rm -sf admin updater >> "$KZ_LOG_DIR/kladez-start.log" 2>&1 \
        || kz_log "rm -sf admin updater failed (compose up will try to recreate them)"
}

kz_load_images() {
    local bundle="$1"
    [ -f "$bundle" ] || kz_die "Не найден файл с программами: $bundle"
    kz_log "loading images from $bundle"
    zstd -dc "$bundle" | docker load >> "$KZ_LOG_DIR/kladez-start.log" 2>&1 \
        || kz_die "Не удалось распаковать программы из установщика."
}

# After an upgrade: remove the previous versions of the images listed in images.lock
# (every old admin image is ~3 GB and ext4.vhdx never gives the space back on its own).
# An image still used by a container is kept — docker refuses to remove it without -f.
kz_prune_old_images() {
    local key keep repo ref
    for key in $(awk '{ print $1 }' "$KZ_HOME/images.lock"); do
        keep=$(kz_image "$key")
        repo=${keep%:*}
        for ref in $(docker images --format '{{.Repository}}:{{.Tag}}' "$repo" 2>/dev/null); do
            [ "$ref" = "$keep" ] && continue
            case "$ref" in *'<none>') continue ;; esac
            if docker image rm "$ref" >> "$KZ_LOG_DIR/kladez-start.log" 2>&1; then
                kz_log "removed old image $ref"
            else
                kz_log "old image $ref is still in use, kept"
            fi
        done
    done
    docker image prune -f >> "$KZ_LOG_DIR/kladez-start.log" 2>&1 || true
    # Tell the virtual disk which blocks are free, so new versions reuse them instead of growing it.
    if command -v fstrim >/dev/null 2>&1; then fstrim -a >> "$KZ_LOG_DIR/kladez-start.log" 2>&1 || true; fi
}

kz_random() { tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 32; }

# Passwords are created once: MySQL keeps the first ones it was initialised with.
kz_ensure_secrets() {
    if [ ! -f "$KZ_SECRETS" ]; then
        mkdir -p "$KZ_HOME"
        {
            echo "APP_KEY=$(kz_random)"
            echo "DB_PASSWORD=$(kz_random)"
            echo "DB_ROOT_PASSWORD=$(kz_random)"
        } > "$KZ_SECRETS"
        chmod 600 "$KZ_SECRETS"
    fi
    # shellcheck disable=SC1090
    . "$KZ_SECRETS"
}

kz_write_conf() {
    mkdir -p "$(dirname "$KZ_CONF")"
    {
        echo "LIBRARY_DIR=$1"
        echo "ADMIN_PORT=$2"
        echo "KIWIX_PORT=$3"
        echo "REGISTRY_MIRRORS=${4:-$KZ_DEFAULT_MIRRORS}"
    } > "$KZ_CONF"
}

kz_read_conf() {
    [ -f "$KZ_CONF" ] || kz_die "«Кладезъ» ещё не установлен: нет $KZ_CONF"
    LIBRARY_DIR=$(sed -n 's/^LIBRARY_DIR=//p' "$KZ_CONF")
    ADMIN_PORT=$(sed -n 's/^ADMIN_PORT=//p' "$KZ_CONF")
    KIWIX_PORT=$(sed -n 's/^KIWIX_PORT=//p' "$KZ_CONF")
    REGISTRY_MIRRORS=$(sed -n 's/^REGISTRY_MIRRORS=//p' "$KZ_CONF")
    REGISTRY_MIRRORS="${REGISTRY_MIRRORS:-$KZ_DEFAULT_MIRRORS}"
}

# images.lock line "key image:tag@sha256:…" → "image:tag" (bundles are tagged without digest).
kz_image() {
    local img
    img=$(awk -v k="$1" '$1 == k { print $2 }' "$KZ_HOME/images.lock")
    [ -n "$img" ] || kz_die "В images.lock нет образа «$1»"
    echo "${img%@sha256:*}"
}

kz_render_compose() {
    local template="$1" out="$2" content admin_image
    content=$(< "$template")
    admin_image=$(kz_image admin)
    local -A values=(
        [LIBRARY_DIR]="$LIBRARY_DIR" [ADMIN_PORT]="$ADMIN_PORT" [KIWIX_PORT]="$KIWIX_PORT"
        [APP_KEY]="$APP_KEY" [DB_PASSWORD]="$DB_PASSWORD" [DB_ROOT_PASSWORD]="$DB_ROOT_PASSWORD"
        [ADMIN_IMAGE]="$admin_image" [UPDATER_IMAGE]="$(kz_image updater)"
        [DISK_COLLECTOR_IMAGE]="$(kz_image disk_collector)" [MYSQL_IMAGE]="$(kz_image mysql)"
        [REDIS_IMAGE]="$(kz_image redis)" [DOZZLE_IMAGE]="$(kz_image dozzle)"
        [REGISTRY_MIRRORS]="$REGISTRY_MIRRORS" [IMAGE_REPO]="${admin_image%:*}"
    )
    local key
    for key in "${!values[@]}"; do
        # Quoted replacement: no & or \ interpretation (bash 5.2 patsub_replacement).
        content=${content//"@@${key}@@"/"${values[$key]}"}
    done
    printf '%s\n' "$content" > "$out"
}

# Prints "nvidia" when an NVIDIA GPU is usable from WSL, otherwise nothing.
# AMD is not detected: inside WSL lspci does not see the video card.
kz_detect_gpu() {
    local smi
    smi=$(command -v nvidia-smi || true)
    [ -z "$smi" ] && [ -x /usr/lib/wsl/lib/nvidia-smi ] && smi=/usr/lib/wsl/lib/nvidia-smi
    [ -n "$smi" ] && "$smi" >/dev/null 2>&1 && echo nvidia
    return 0
}

# GPU marker for the admin (same files as install_nomad.sh verify_gpu_setup). Written only
# when the NVIDIA container toolkit is present, otherwise containers would fail to start.
kz_write_gpu_marker() {
    local toolkit="${KZ_NVIDIA_TOOLKIT-$(command -v nvidia-ctk || true)}"
    rm -f "$LIBRARY_DIR/.nomad-amd-gfx"
    if [ "$(kz_detect_gpu)" = nvidia ] && [ -n "$toolkit" ]; then
        echo nvidia > "$LIBRARY_DIR/.nomad-gpu-type"
    else
        rm -f "$LIBRARY_DIR/.nomad-gpu-type"
    fi
}

kz_up() {
    docker compose -p "$KZ_PROJECT" -f "$KZ_COMPOSE" up -d >> "$KZ_LOG_DIR/kladez-start.log" 2>&1 \
        || kz_die "Не удалось запустить программы «Кладезъ»."
}

kz_wait_health() {
    local port="$1" timeout="${2:-${KZ_HEALTH_TIMEOUT:-300}}" i
    for ((i = 0; i < timeout; i += 2)); do
        curl -fsS -o /dev/null "http://localhost:${port}/api/health" && return 0
        sleep 2
    done
    kz_die "«Кладезъ» не ответил за $timeout секунд."
}

kz_status() {
    [ "$(docker inspect -f '{{.State.Running}}' nomad_admin 2>/dev/null)" = true ]
}
