FROM postgres:16

# pgaudit is packaged for the official Debian-based postgres images via
# the PGDG apt repo, which is already configured in this base image.
RUN apt-get update \
    && apt-get install -y --no-install-recommends postgresql-16-pgaudit \
    && rm -rf /var/lib/apt/lists/*

COPY init.sql /docker-entrypoint-initdb.d/10-init.sql
COPY init-test-db.sql /docker-entrypoint-initdb.d/20-init-test-db.sql
