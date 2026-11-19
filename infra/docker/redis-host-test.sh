#!/bin/sh
# Exercises the REAL redis_host_from_url() from the entrypoint, extracted from
# the file itself so the test cannot drift from the code.
#
# The extraction has to survive the function body containing `$` characters,
# so it is done with sed rather than copied by hand.

FN=$(sed -n '/^redis_host_from_url() {/,/^}/p' /d/entrypoint.sh)

if [ -z "$FN" ]; then
  echo "FAIL: the function was not found in the entrypoint"
  exit 1
fi

eval "$FN"

check() {
  url="$1"
  host=$(redis_host_from_url "$url")
  case "$host" in
    ""|127.0.0.1|localhost|::1) verdict="EMBEDDED (start the local redis)" ;;
    *) verdict="EXTERNAL (use $host)" ;;
  esac
  printf '%-42s -> host=%-18s %s\n' "${url:-<unset>}" "${host:-<none>}" "$verdict"
}

check ""
check "redis://127.0.0.1:6379/0"
check "redis://:secret@127.0.0.1:6379/0"
check "rediss://default:pw@us1.upstash.io:6379"
check "redis://localhost:6379"
check "redis://:p@ss@host.example:6379"
check "redis://cache.internal:6379/2"
