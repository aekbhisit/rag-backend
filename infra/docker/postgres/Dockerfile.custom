FROM postgres:17.6

# Install PostGIS + pgvector for PostgreSQL 17
RUN set -eux; \
    apt-get update; \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      postgresql-17-postgis-3 \
      postgresql-17-postgis-3-scripts \
      postgresql-17-pgvector \
      postgresql-contrib; \
    rm -rf /var/lib/apt/lists/*

# Extensions will be enabled by initdb scripts mounted at /docker-entrypoint-initdb.d

