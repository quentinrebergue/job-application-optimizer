# syntax=docker/dockerfile:1

FROM node:22-slim AS base

# ---- deps: install node_modules with full devDependencies for the build ----
FROM base AS deps
WORKDIR /app
# match the npm version the lockfile was generated with (avoids npm ci
# resolution mismatches on optional/platform-specific dependencies)
RUN npm install -g npm@11
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: compile the Next.js app ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- runner: minimal runtime image ----
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PDFLATEX_PATH=/usr/bin/pdflatex

# LaTeX toolchain for resume PDF generation (src/lib/latex/compiler.ts)
RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-latex-base \
    texlive-latex-recommended \
    texlive-latex-extra \
    texlive-fonts-recommended \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

# Next.js standalone output: minimal server + pruned node_modules
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# data/ is mounted as a volume at runtime (see docker-compose.yml); this
# creates the mount point with the right ownership before switching user.
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
