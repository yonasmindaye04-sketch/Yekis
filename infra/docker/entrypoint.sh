#!/bin/sh
# =============================================================================
# Yekis container entrypoint.
# =============================================================================
#
# It does three things, in order, and then hands the container over to the API:
#
#   1. Makes sure there is a Redis. AletCloud sells no managed Redis, and the
#      API cannot boot without one (BullMQ workers, the rate-limit store and
#      the Telebirr token cache all need it). Unless REDIS_URL points at
#      another host, the bundled redis-server is started on loopback and
#      REDIS_URL is rewritten to match it.
#
#   2. Applies the Prisma migrations. `prisma migrate deploy` is not something
#      a container platform does for you, and a database that is missing the
#      schema behind a healthy port is a deployment that looks alive and is
#      not. Set RUN_MIGRATIONS=false to skip it.
#
#   3. Starts the API and forwards termination signals to it, so a rolling
#      release stops the old container gracefully instead of killing it.
#
# The object-store environment variables need no work here: `config/env.ts`
# already falls back to the standard AWS_* names that AletCloud injects when
# a bucket is linked to an app.
# =============================================================================

set -eu

APP_DIR="${APP_DIR:-/app}"
cd "$APP_DIR"

log() {
  printf '[yekis] %s\n' "$*"
}

# ── 1. Redis ────────────────────────────────────────────────────────────────

# The host part of a redis:// URL, without the scheme, the credentials or the
# port. Used to decide whether REDIS_URL points at this container or
# somewhere else.
redis_host_from_url() {
  printf '%s' "$1" \
    | sed -e 's#^[A-Za-z0-9+.-]*://##' \
          -e 's#^.*@##' \
          -e 's#[:/].*$##'
}

REDIS_HOST=""
if [ -n "${REDIS_URL:-}" ]; then
  REDIS_HOST="$(redis_host_from_url "$REDIS_URL")"
fi

REDIS_PID=""
REDIS_PASSWORD="${REDIS_PASSWORD:-}"

case "$REDIS_HOST" in
  ""|127.0.0.1|localhost|::1)
    # No REDIS_URL at all, or one that points at this container: run the
    # bundled redis-server.
    #
    # The password is generated per boot when it was not supplied. That is
    # safe here because redis binds to loopback only and never leaves the
    # container; a new password on the next boot costs nothing, because the
    # data in it (rate-limit counters, cached tokens, queue state) is
    # disposable.
    if [ -z "$REDIS_PASSWORD" ]; then
      REDIS_PASSWORD="$(od -An -tx1 -N16 /dev/urandom | tr -d ' \n')"
    fi

    log "starting the bundled redis-server on 127.0.0.1:6379"
    redis-server \
      --bind 127.0.0.1 \
      --port 6379 \
      --protected-mode yes \
      --requirepass "$REDIS_PASSWORD" \
      --save '' \
      --appendonly no \
      --dir /tmp \
      >/tmp/redis.log 2>&1 &
    REDIS_PID=$!

    export REDIS_URL="redis://:${REDIS_PASSWORD}@127.0.0.1:6379/0"

    attempt=0
    while [ "$attempt" -lt 50 ]; do
      if redis-cli -a "$REDIS_PASSWORD" --no-auth-warning ping 2>/dev/null | grep -q PONG; then
        break
      fi
      attempt=$((attempt + 1))
      sleep 0.2
    done

    if ! redis-cli -a "$REDIS_PASSWORD" --no-auth-warning ping 2>/dev/null | grep -q PONG; then
      log "FATAL: the bundled redis-server did not come up"
      cat /tmp/redis.log 2>/dev/null || true
      exit 1
    fi
    log "redis-server is up"
    ;;

  *)
    # An external Redis (another app, or a server). Leave it alone.
    log "using the external Redis at ${REDIS_HOST}; no bundled redis-server started"
    ;;
esac

# ── 2. Database ─────────────────────────────────────────────────────────────

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  PRISMA_BIN="apps/backend/node_modules/.bin/prisma"
  if [ ! -x "$PRISMA_BIN" ]; then
    log "FATAL: ${PRISMA_BIN} is missing from the image"
    exit 1
  fi

  log "applying Prisma migrations"
  if ! ( cd apps/backend && ./node_modules/.bin/prisma migrate deploy ); then
    log "FATAL: prisma migrate deploy failed; refusing to start the API against an out-of-date schema"
    exit 1
  fi
  log "migrations applied"
fi

# ── 3. Application ──────────────────────────────────────────────────────────

APP_PID=""

shutdown() {
  # Re-arm nothing: a second signal must not start a second shutdown.
  trap - TERM INT

  log "termination signal received; shutting down"

  if [ -n "$APP_PID" ]; then
    kill -TERM "$APP_PID" 2>/dev/null || true
    # The API has its own graceful shutdown (stop the bot, close the server,
    # then exit). Give it the window it asked for before insisting.
    waited=0
    while [ "$waited" -lt 15 ] && kill -0 "$APP_PID" 2>/dev/null; do
      sleep 1
      waited=$((waited + 1))
    done
    kill -KILL "$APP_PID" 2>/dev/null || true
  fi

  if [ -n "$REDIS_PID" ]; then
    redis-cli -a "$REDIS_PASSWORD" --no-auth-warning shutdown nosave >/dev/null 2>&1 || true
  fi
}

trap shutdown TERM INT

log "starting the API on port ${PORT:-8080}"
node apps/backend/dist/server.js &
APP_PID=$!

STATUS=0
wait "$APP_PID" || STATUS=$?

log "the API exited with status ${STATUS}"
exit "$STATUS"
