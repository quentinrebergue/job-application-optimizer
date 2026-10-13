# src/lib

Server-side business logic. All functions are barrel-exported from `index.ts`. Three sub-libraries: data access, resume rendering, and AI ranking.

## Subdirectories

| Directory | Description |
|-----------|-------------|
| `data/` | Data access on Postgres, scoped to the signed-in user |
| `auth/` | Sessions, password hashing, email confirmation (`email-verification.ts`), password reset (`password-reset.ts`), the change of password and of address from the account page (`credentials.ts`, #236), the hashing of passwords (`password.ts`: by the password-hasher service of the cluster when `PASSWORD_HASHER_URL` is set, asked twice, `BusyError` when it is full, bcryptjs in the app when it does not answer; unset, bcryptjs in the app; #254), the limits on failed logins (`login-limit.ts`, #225): per email 5 in 15 minutes and per address 60 an hour (IPv6 by its /64), counted before the password is checked and given back on a success, so attempts sent at the same moment cannot all slip through; a warning at 300 an hour for the site; counters older than their window are deleted after a failed login; `LOGIN_FAILS_PER_IP_PER_HOUR`, `LOGIN_FAILS_ALERT_PER_HOUR` and the limit on sign-ups (`signup-limit.ts`: per address, IPv6 by its /64, 30 an hour and 60 a day; for the site a warning at 150 a day and a refusal only at 1,000; `SIGNUPS_PER_IP_PER_HOUR`, `SIGNUPS_PER_IP_PER_DAY`, `SIGNUPS_ALERT_PER_DAY`, `SIGNUPS_MAX_PER_DAY`; #210) |
| `maintenance.ts` | The cleanup of what the app keeps only for a while (#213), started by `instrumentation.ts`: a pass a minute after the start, then every ten minutes. Deletes the counters past their window (`rate_limits`, `login_attempts`), expired `sessions`, `email_tokens` a day after they expire, and the `ai_usage` calls of the months before the previous one, which are added up per month and model into `ai_usage_monthly` (no identity) by the same statement that deletes them (`AI_USAGE_MONTHS_KEPT` in `config/legal.ts`, written on the privacy page). |
| `concurrency.ts` | `limitConcurrency(maxActive, maxQueued)`: at most N jobs at once, the others wait in order, a `BusyError` past the queue. Around the hashing of passwords (`BCRYPT_CONCURRENCY` 2, `BCRYPT_QUEUE` 150): bcryptjs runs on the main thread, 40 checks at once froze the application for 4 s, two at a time for 0.4 s (#225). |
| `account-notice.ts` | The mails that tell an owner their data was downloaded (at most one an hour), their account deleted, their password changed, their address asked or changed, or someone tried to use it for another account, sent after the response (#104, #236) |
| `email/` | `sendEmail()` over SMTP through an ordered list of providers (primary, optional fallback); mails printed in the console in development |
| `resume/` | Builds the render payload from entities and the user profile, and calls the resume-renderer service (Go + Typst). `soft-breaks.ts` adds zero-width spaces inside the words of 61 characters or more with nothing to break at (a run of letters, an identifier), so a long word wraps instead of running off the page; ordinary text and the contact details are never touched. |
| `ai/` | AI ranking of the library against a job offer |

## Files

| File | Description |
|------|-------------|
| `index.ts` | Barrel export — re-exports `data` and `ai` modules |
| `cn.ts` | `cn()` — joins class names (clsx + tailwind-merge aware of the design tokens). Client-safe. |
| `format.ts` | `formatDate(iso, style)` — dates in UTC so server and browser render the same text. Client-safe. |
| `http.ts` | `fetchJson(url, { json })` — client fetch that throws `HttpError` (with the server's message) when the response is not ok. |
| `entity-filter.ts` | `LIBRARY_TABS` (no "All"), `parseLibraryTab()` (defaults to experiences), `parseEntityType()`, `libraryHref()` — the `?tab=` / `?type=` of the library in `/resume`. |
| `rate-limit.ts` | `consumeRateLimit(key, limit, windowMs)` and `refundRateLimit(key)` (gives a hit back) — fixed-window counters in the `rate_limits` table (Redis later, #141); `clientIp(headers)`, `isPublicIp(ip)` (private addresses are not limited: they are the load balancer, shared by everyone). |
| `text-limit.ts` | `tooLong(value, max)`, `counterFor(value, max)`, `isLongText(max)`: what a form shows about the size of a text (#201). Client-safe. |
| `security/origin.ts` | `checkOrigin(method, headers)` (#206): a POST, PUT, PATCH or DELETE must come from our own pages (`Sec-Fetch-Site: same-origin`, else `Origin`, else `Referer`, against our own host); called by `src/proxy.ts` for `/api`. Another origin of the same site (another subdomain or port) is refused too, which `SameSite=Lax` does not do. |
| `security/csp.ts` | The Content Security Policy of the pages (#205): `buildCsp(nonce)` (nothing loads from outside the app, scripts and style elements only with the request's nonce, no framing), `newNonce()`, `cspMode()` (`CSP_MODE=report-only` reports without blocking). Set per request by `src/proxy.ts`; the root layout renders every page at the request so Next.js can put the nonce on its scripts. |
| `env.ts` | `envNumber(name, fallback)`: a positive number from the environment, the default for a typo (so a typo cannot switch a limit off). Used by the quotas, the AI limits and the sign-up limit. |
| `quotas.ts` | How much a user may create and how fast (#202): `quotas()` (the numbers, from the environment: `MAX_JOBS`, `JOBS_PER_HOUR`, `JOBS_PER_DAY`, `ENTITIES_PER_HOUR`, `ENTITIES_PER_DAY`, `PDFS_PER_HOUR`, `PDFS_PER_DAY`), `consumeCreation(userId, kind)` (the 429 to send, or null), `capReached()` (the 403 of a cap). A delete does not give a creation back. |
| `validation/read-json.ts` | `readJson(request, schema, maxBytes)`: refuses the three types an HTML form can send (415), reads a JSON body without going over `maxBytes` (413 `body_too_large`), then checks it (400 naming the field and its limit). Used by every route that takes a body. |
| `job-filter.ts` | `parseStatusFilter()` — the `?status=` filter of `/jobs`; `parseJobTab()` — the `?tab=` of a job page. |
