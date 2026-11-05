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
    nohup dockerd >> "$KZ_LOG_DIR/dockerd.log" 2>&1 &
    for ((i = 0; i < timeout; i++)); do
        docker info >/dev/null 2>&1 && return 0
        sleep 1
    done
    kz_die "Не удалось запустить Docker внутри «Кладезъ». Перезагрузите компьютер и попробуйте ещё раз."
}

kz_load_images() {
    local bundle="$1"
    [ -f "$bundle" ] || kz_die "Не найден файл с программами: $bundle"
    kz_log "loading images from $bundle"
    zstd -dc "$bundle" | docker load >> "$KZ_LOG_DIR/kladez-start.log" 2>&1 \
        || kz_die "Не удалось распаковать программы из установщика."
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
