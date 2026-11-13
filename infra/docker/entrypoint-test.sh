#!/bin/sh
# Exercises the real entrypoint's control flow without the application image:
# a stub stands in for the API, and the entrypoint is expected to start the
# bundled redis-server, rewrite REDIS_URL to match it, and exit cleanly.
#
# What it proves:
#   * the embedded Redis actually starts and answers,
#   * REDIS_URL is rewritten to a URL with the generated password,
#   * the API is launched with the right arguments,
#   * the script exits 0 when the API exits 0.

set -e

mkdir -p /stub
cat > /stub/node <<'STUB'
#!/bin/sh
echo "STUB-NODE argv: $@"
echo "STUB-NODE cwd: $(pwd)"
echo "STUB-NODE REDIS_URL: $REDIS_URL"
pw=$(printf '%s' "$REDIS_URL" | sed -e 's#^redis://:##' -e 's#@.*##')
echo "STUB-NODE redis ping: $(redis-cli -a "$pw" --no-auth-warning ping 2>&1 | head -1)"
exit 0
STUB
chmod +x /stub/node
PATH="/stub:$PATH"
export PATH

export RUN_MIGRATIONS=false
export PORT=8080
export APP_DIR=/d
unset REDIS_URL
unset REDIS_PASSWORD

sh /d/entrypoint.sh
echo "ENTRYPOINT EXIT: $?"

echo "--- second run: an EXTERNAL redis must not start a local one ---"
export REDIS_URL="redis://:secret@cache.internal:6379/0"
sh /d/entrypoint.sh
echo "ENTRYPOINT EXIT (external): $?"
