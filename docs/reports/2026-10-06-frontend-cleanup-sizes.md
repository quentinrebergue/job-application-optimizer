# Frontend cleanup: what it changed in size

**Date:** 2026-10-06
**Work:** ticket #100, PR #115 (cleanup); PR #117 (fix of the Docker build it broke: the emptied `public/` folder)

## What was removed

The modules hidden since #79 and everything only they used:
- Q&A, Coding, Tags (taxonomy), cover letter, LinkedIn bookmarklet: pages, components, API routes, data functions, schemas and types;
- the interview questions of entries and jobs (code only; the DB columns stay until #113);
- the local MCP server (`mcp/`), an unused OpenAI ranker (`/api/ai/rank`);
- Markdown rendering, its global CSS and the code highlighting theme, which were loaded on every page;
- 9 dependencies: `openai`, `react-markdown`, `remark-gfm`, `rehype-highlight`, `highlight.js`, `@modelcontextprotocol/sdk`, `react-d3-tree`, `@tailwindcss/typography`, `tsx`.

In the diff: 142 files, about 8,800 lines of code removed (lockfile not counted).

## Method

Both versions built the same way, side by side, from clean copies of the repository:
- **before**: `c9907e2` (master just before the cleanup);
- **after**: `2125153` (master with the cleanup and the Docker fix).

Environment: macOS (Apple silicon), Node 22.23.3, npm 12.2.0, `next build` (Turbopack, `output: 'standalone'`). The image is built on Linux (`node:22-slim`), so its absolute sizes differ slightly; the comparison between the two versions holds.

```bash
OUT=/tmp/sizes
for c in c9907e2 2125153; do
  mkdir -p $OUT/$c && git archive $c | tar -x -C $OUT/$c
  (cd $OUT/$c && npm ci --no-audit --no-fund && NEXT_TELEMETRY_DISABLED=1 npx next build)
done

for c in c9907e2 2125153; do
  cd $OUT/$c && echo "== $c"
  du -sk .next/standalone                    # server copied into the image
  du -sk .next/standalone/node_modules       # its dependencies
  du -sk .next/static                        # JS and CSS served to browsers
  find .next/static -name '*.css' -exec cat {} + | wc -c            # CSS, raw
  find .next/static -name '*.css' -exec cat {} + | gzip -9 | wc -c  # CSS, as sent (gzip)
  find .next/static -name '*.js'  -exec cat {} + | wc -c            # JS, all routes
  du -sk node_modules                        # dependencies installed by npm ci
done
```

## Results

| Measure | Before | After | Change |
|---|---|---|---|
| Global CSS, loaded on every page (gzip) | 14.8 KB | 7.0 KB | **−53 %** |
| Global CSS, raw | 75.5 KB | 31.9 KB | −58 % |
| JS of all routes | 1.55 MB | 1.00 MB | −35 % |
| JS + CSS served to browsers (`.next/static`) | 1.77 MB | 1.16 MB | −34 % |
| Server copied into the image (`.next/standalone`) | 48.0 MB | 45.1 MB | −6 % |
| … of which `node_modules` | 40.6 MB | 40.6 MB | 0 |
| Dependencies installed by `npm ci` (build stage only) | 666 MB | 589 MB | −12 % |

## What it means

- **Every page is lighter on first visit**: the global CSS is halved. The removed part was the code highlighting theme and the Markdown styles, loaded everywhere and used nowhere in Jobs or Resume.
- **The JS of a given page barely changed**: Next.js splits the code per route, so the removed modules' code was only loaded on their own pages. The 550 KB of JS saved were in routes nobody opened.
- **The image is about 3 MB smaller**, which is small against the `node:22-slim` base. The standalone output already copies only the dependencies the server uses, so the removed packages were mostly not in the image. The base image is the real lever: #118.
- **The build is a bit faster**: 77 MB fewer dependencies to install in the build stage (not shipped in the image).
- **The main gain is not measured here**: half the code to read and maintain before the repository goes public, no raw colour left in the code (the design-token test is now strict), and fewer dependencies to watch for vulnerabilities.

## Lesson

The cleanup emptied `public/`; git does not keep empty folders, so the Dockerfile's `COPY /app/public` failed after the merge and the deploy was skipped (production stayed on the previous version). The local `next build` and CI passed because neither builds the image: #116 adds the Docker build to CI.
