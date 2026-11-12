# «Кладезъ»: root filesystem of the Kladez WSL distro (spec Б5).
# Build context: installer/linux. Built in CI (build-rootfs.sh), never on the user's computer.
FROM debian:12-slim

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends ca-certificates curl gnupg; \
    install -m 0755 -d /etc/apt/keyrings; \
    curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc; \
    chmod a+r /etc/apt/keyrings/docker.asc; \
    echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian bookworm stable" \
      > /etc/apt/sources.list.d/docker.list; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
      docker-ce docker-ce-cli containerd.io docker-compose-plugin \
      zstd iproute2 util-linux procps iptables; \
    # Old WSL kernels (wsl_update_x64.msi, 5.10) break dockerd with iptables-nft.
    update-alternatives --set iptables /usr/sbin/iptables-legacy; \
    update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy; \
    apt-get purge -y gnupg; apt-get autoremove -y; \
    rm -rf /var/lib/apt/lists/* /var/cache/apt/*

COPY rootfs/wsl.conf /etc/wsl.conf
COPY rootfs/daemon.json /etc/docker/daemon.json
COPY kladez-lib.sh dns-tcp.js /usr/local/lib/kladez/
COPY kladez-start /usr/local/bin/kladez-start
COPY compose.template.yaml images.lock /opt/project-nomad/
RUN chmod 0755 /usr/local/bin/kladez-start && mkdir -p /opt/project-nomad/mysql /opt/project-nomad/redis
