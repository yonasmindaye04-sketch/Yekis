# syntax=docker/dockerfile:1

# =============================================================================
# Yekis — a single container that serves the whole platform.
# =============================================================================
#
# Built for AletCloud App Hosting (docs/ALETCLOUD_DEPLOYMENT.md), and usable
# anywhere else that runs a container and hands out a port.
#
# WHY ONE IMAGE
# -------------
# The Telegram Mini App refuses to load a page from an origin other than the
# one it was opened with, so the SPA and the API have to share an origin, and
# therefore a TLS certificate. AletCloud's path routing would give us that,
# but it is not documented whether it strips the /api prefix before
# forwarding, and the frontend already expects the API at exactly /api/v1.
# One container, one origin, one certificate, nothing to guess: the API
# process serves the built SPA at / and keeps its own routes at /api/v1.
#
# WHY A DOCKERFILE AT ALL
# ----------------------
# AletCloud's stack detection reads the repository root, finds `vite` and
# `react-dom` in the root package.json, and would build a static site with
# `npm run build` — which fails anyway, because there is no package-lock.json
# and the workspace is pnpm. AletCloud's own documentation says a committed
# Dockerfile takes precedence over detection. This file is that Dockerfile.
#
# WHAT IS IN THE IMAGE
# --------------------
#   * the compiled API (apps/backend/dist) with the Prisma schema and
#     migrations,
#   * the built SPA (apps/frontend/dist), served by the API process,
#   * the Prisma CLI and its engines, so `prisma migrate deploy` can run at
#     container start,
#   * redis-server, so the BullMQ workers, the API rate limiter and the
#     Telebirr token cache have a Redis that stays inside Ethiopia.
#
# THE PORT CONTRACT
# -----------------
# The container honours PORT and the API binds every interface, which is what
# a platform health check needs: a process bound to loopback is invisible to
# both the check and every visitor.
# =============================================================================

ARG NODE_VERSION=20

# ── base ────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-bookworm-slim AS base

ENV CI=true \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false

# The install is the longest and most failure-prone step of the build, and it
# runs against a registry that is a long way away. The defaults give a
# connection reset two chances and a 60-second ceiling per request, which is
# not enough for a link that drops under load: a reset mid-download fails the
# whole build, and a failed build costs a whole build minute.
#
# More attempts, a longer per-request ceiling, and fewer parallel connections
# (16 is pnpm's default; 8 is enough to saturate a normal link and leaves
# headroom for the retries). These are set as environment variables rather
# than in the repository's .npmrc so they change the deployment build only.
ENV npm_config_fetch_retries=5 \
    npm_config_fetch_retry_factor=2 \
    npm_config_fetch_retry_mintimeout=10000 \
    npm_config_fetch_retry_maxtimeout=120000 \
    npm_config_fetch_timeout=300000 \
    npm_config_network_concurrency=8

# pnpm comes from npm rather than from corepack: the repository pins
# packageManager to pnpm@9.0.0, and corepack refuses to run a different 9.x.
# `pnpm@9` is the same major the CI workflow installs.
#
# The explicit retry flags matter: the registry is a long way off, and a
# connection reset during this step fails the whole build.
RUN npm install -g pnpm@9 \
      --fetch-retries=5 \
      --fetch-retry-factor=2 \
      --fetch-retry-mintimeout=10000 \
      --fetch-retry-maxtimeout=120000 \
      --fetch-timeout=300000

WORKDIR /app

# ── deps ────────────────────────────────────────────────────────────────────
# Only the manifests are copied, so this layer is reused until a dependency
# actually changes. .npmrc is copied because it carries legacy-peer-deps=true,
# without which the install does not resolve the same way it does on a
# workstation.
FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/schemas/package.json packages/schemas/package.json

RUN pnpm install --frozen-lockfile

# ── build ───────────────────────────────────────────────────────────────────
FROM deps AS build

COPY apps/backend apps/backend
COPY apps/frontend apps/frontend
COPY packages packages

# `prisma generate` is run explicitly rather than through the backend's own
# `prebuild` hook: pnpm does not run pre/post scripts by default
# (enable-pre-post-scripts has defaulted to false since pnpm 7), so that hook
# never fires. The generated client and the downloaded engines are what the
# runtime stage copies.
RUN pnpm --filter backend exec prisma generate \
 && pnpm --filter backend run build \
 && pnpm --filter frontend run build

# ── runtime ─────────────────────────────────────────────────────────────────
FROM base AS runtime

# redis-server: see the header. AletCloud sells PostgreSQL, MySQL and
# MongoDB, and no Redis. An external one (Upstash, for instance) would put
# rate-limit counters, session state and the cached Telebirr fabric token
# outside Ethiopia, which PDPP No. 1321/2024 Art. 22 does not permit for
# personal data. ca-certificates is for the outbound HTTPS calls (object
# store, Telegram).
RUN apt-get update \
 && apt-get install -y --no-install-recommends redis-server ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# NODE_ENV is "staging" on purpose. "production" switches on the fail-closed
# checks in config/env.ts, which refuse to boot without a real PEP screening
# provider, a Telegram webhook secret, a guest-support signing key and an
# https API_PUBLIC_URL — a set of credentials a test deployment does not have
# and should not fake. "staging" still keeps the rate limiter on and still
# fails on a malformed configuration.
ENV NODE_ENV=staging \
    PORT=8080 \
    SERVE_FRONTEND=true \
    FRONTEND_DIST_DIR=/app/apps/frontend/dist \
    RUN_MIGRATIONS=true \
    NPM_CONFIG_FUND=false

WORKDIR /app

# The node_modules are taken from the BUILD stage rather than from a separate
# production-only install, because `prisma generate` writes the generated
# client and downloads the query and migration engines into node_modules.
# Keeping the dev dependencies is what leaves the Prisma CLI available for
# the migration run at container start. A dedicated `migrate` job would let
# this be slimmed; it is not worth the extra moving parts for a test
# deployment.
#
# `--chown=node:node` on the copies is not a convenience. A separate
# `chown -R node:node /app` after the copies walks the whole pnpm
# node_modules tree — hundreds of thousands of files — and took over seven
# minutes in the first build of this image, in an extra layer that duplicates
# the metadata of the two gigabytes below it. Copying with the right owner
# does the same work as part of the copy, for free.
COPY --chown=node:node --from=build /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --chown=node:node --from=build /app/packages ./packages
COPY --chown=node:node --from=build /app/apps/backend/dist ./apps/backend/dist
COPY --chown=node:node --from=build /app/apps/backend/prisma ./apps/backend/prisma
COPY --chown=node:node --from=build /app/apps/frontend/dist ./apps/frontend/dist

COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY --chown=node:node apps/backend/package.json apps/backend/package.json
COPY --chown=node:node apps/frontend/package.json apps/frontend/package.json
COPY --chown=node:node packages/schemas/package.json packages/schemas/package.json

COPY --chown=node:node infra/docker/entrypoint.sh /usr/local/bin/yekis-entrypoint

# The chat-attachment fallback writes to ./uploads relative to the working
# directory, so that directory has to exist and be writable by the user the
# process runs as.
#
# The `sed` is not redundant. A shell script with CRLF line endings has a
# shebang reading "#!/bin/sh\r", which the kernel cannot resolve, and its
# line continuations break — so the container fails to start with an error
# that points at the image rather than at the file. `.gitattributes` keeps
# the script LF in the repository and in a Windows checkout; this makes the
# image correct even when the source arrived another way (a zip upload, a
# patch applied by hand, a mirror that rewrote the endings).
RUN chmod +x /usr/local/bin/yekis-entrypoint \
 && sed -i 's/\r$//' /usr/local/bin/yekis-entrypoint \
 && mkdir -p /app/uploads \
 && chown node:node /app /app/uploads

USER node

EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/yekis-entrypoint"]
CMD ["node", "apps/backend/dist/server.js"]
