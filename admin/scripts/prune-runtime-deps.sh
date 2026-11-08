#!/bin/sh
# Kladez: remove from the production node_modules what the running server never loads.
# Called from the Dockerfile (production-deps stage) right after `npm ci --omit=dev`.
#
# npm puts these there anyway: peers of @adonisjs/vite / @tailwindcss/vite (the vite
# toolchain), peers of @adonisjs/core (TypeScript) and stray runtime «dependencies» of
# @openzim/libzim (ts-node, node-gyp, @types/*). The interface is already built by vite
# in the build stage, and the server is plain JavaScript, so none of this is used.
# The image smoke test (.github/workflows/preview-admin-image.yml) boots the server and
# opens pages after this, so a wrong entry here fails the build instead of a user's PC.
set -eu
NM="${1:?usage: prune-runtime-deps.sh <node_modules>}"

before=$(du -sm "$NM" | cut -f1)
for dir in \
    vite rollup @rollup esbuild @esbuild \
    lightningcss lightningcss-linux-x64-gnu lightningcss-linux-x64-musl \
    lightningcss-linux-arm64-gnu lightningcss-linux-arm64-musl \
    @tailwindcss tailwindcss \
    typescript @swc ts-node node-gyp \
    @vavite vite-plugin-restart \
    @types
do
    rm -rf "$NM/$dir"
done
after=$(du -sm "$NM" | cut -f1)
echo "prune-runtime-deps: node_modules ${before} MB -> ${after} MB"
