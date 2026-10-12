# Everything the load tests need, so that nothing is installed on the machine that runs them: k6 (the load generator)
# and Node with bcryptjs (seed.sh hashes the password of the test accounts with it). Built the first time load/run.sh or
# load/seed.sh is run, and again with LOAD_REBUILD=1. Versions and digests are pinned like the other images (#143).
FROM grafana/k6:2.3.0@sha256:9c2dee7f8ed74d317e4027c06a10f169b625638189de8d4555d0b3486a5aeb34 AS k6

FROM node:22.23.3-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402
COPY --from=k6 /usr/bin/k6 /usr/bin/k6
# The same bcryptjs as the app (package.json), cost 12 like the real accounts.
RUN npm install --prefix /opt/tools --no-audit --no-fund --no-save bcryptjs@3.0.3
ENV NODE_PATH=/opt/tools/node_modules
WORKDIR /load
