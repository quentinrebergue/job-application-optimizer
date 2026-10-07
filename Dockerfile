# syntax=docker/dockerfile:1

# Base images pinned to an exact version and digest (#143): every build uses the
# same bytes. Dependabot opens a PR when a new version is out.
FROM node:22.23.3-slim@sha256:c3de60bf2f9dd0ac6370e6117950ff62d6e339527e7472301c9c78a017978392 AS base

# ---- deps: install node_modules with full devDependencies for the build ----
FROM base AS deps
WORKDIR /app
# match the npm version the lockfile was generated with (avoids npm ci
# resolution mismatches on optional/platform-specific dependencies)
RUN npm install -g npm@11.21.0
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: compile the Next.js app ----
# Starts from deps rather than copying node_modules over: a copy would be a
# second ~590 MB layer, written to the CI layer cache on every build (#166).
FROM deps AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
# .next/cache only speeds up the next build on the same machine; in this layer
# it is never reused (code changes rebuild it) but it would be cached and exported.
RUN npm run build && rm -rf .next/cache

# ---- runner: minimal runtime image ----
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

# Next.js standalone output: minimal server + pruned node_modules
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
