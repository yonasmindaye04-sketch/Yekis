# Container tooling

The scripts in this directory are the deployment image's moving parts, and
they are shell rather than TypeScript, which means they fail in ways the rest
of the codebase cannot: a shell script does not type-check, and the things
that break it — a line ending, a quoting mistake, a command that behaves
differently on a busybox host — only show up when a container starts.

So they are exercised rather than trusted.

| File | What it is |
|---|---|
| `entrypoint.sh` | The image's entrypoint. Starts the bundled Redis, applies the Prisma migrations, runs the API and forwards termination signals to it. |
| `entrypoint-test.sh` | Exercises `entrypoint.sh` with a stub in place of the API. Proves the Redis starts and answers, that `REDIS_URL` is rewritten to match it, that an external `REDIS_URL` suppresses the local Redis, and that the script exits cleanly. |
| `redis-host-test.sh` | Extracts `redis_host_from_url()` from `entrypoint.sh` itself — so the test cannot drift from the code — and runs the URL shapes through it. |

Both tests run in CI (the `container` job in `.github/workflows/ci.yml`):

```bash
docker run --rm -v "$PWD/infra/docker:/d:ro" --entrypoint sh redis:7-alpine \
  -c 'sh /d/entrypoint-test.sh'

docker run --rm -v "$PWD/infra/docker:/d:ro" --entrypoint sh node:20-bookworm-slim \
  -c 'sh /d/redis-host-test.sh'
```

## Line endings

These files are LF, everywhere. A shell script with CRLF endings has a
shebang reading `#!/bin/sh\r`, which the kernel cannot resolve, and its line
continuations break — so the container dies with an error that points at the
image rather than at the file.

`.gitattributes` keeps them LF in the repository and in a Windows checkout
(`core.autocrlf=true` would otherwise rewrite them), and the `Dockerfile`
strips any stray `\r` from the entrypoint as it copies it in, so the image is
correct even when the source arrived another way.
