FROM postgis/postgis:17-3.4

# Install pgvector for PostgreSQL 17 and useful contribs
RUN set -eux; \
    apt-get update; \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      postgresql-17-pgvector \
      postgresql-contrib; \
    rm -rf /var/lib/apt/lists/*

# Extensions will be enabled by initdb scripts in /docker-entrypoint-initdb.d
