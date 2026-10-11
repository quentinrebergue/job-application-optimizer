/**
 * routes-need-session.test.ts
 *
 * Every route of /api answers 401 to a visitor with no session (#220), except the few that are
 * public on purpose and listed here with why. A new route that forgets the check passes every other
 * test; here it fails. Each handler is called with no session and a database that fails on any use,
 * so a route that reads before checking fails too.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import path from 'path'

// Modules that guard themselves against the browser (server-only) refuse to load under the test runner.
vi.mock('server-only', () => ({}))
vi.mock('@/lib/db', () => ({
  pool: {
    query: vi.fn().mockRejectedValue(new Error('the database was used before the session was checked')),
    connect: vi.fn().mockRejectedValue(new Error('the database was used before the session was checked')),
  },
}))
vi.mock('@/lib/auth/session', () => ({ getSessionUserId: vi.fn().mockResolvedValue(null) }))
vi.mock('next/headers', () => ({ headers: async () => new Headers(), cookies: async () => ({ get: () => undefined }) }))

/** Public on purpose, and why. */
const PUBLIC_ROUTES: Record<string, string> = {
  'healthz/route.ts': 'readiness probe of Kubernetes and the uptime check: answers 200 or 503, no data',
  'livez/route.ts': 'liveness probe: answers 200, no data, no dependency',
  'csp-report/route.ts': 'browsers report a policy violation without a session: answers 204 whatever it gets',
}

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const

// Every route.ts of src/app/api, loaded lazily so that the mocks above apply.
const modules = import.meta.glob('../app/api/**/route.ts') as Record<string, () => Promise<Record<string, unknown>>>
const routes = Object.keys(modules).map((file) => ({
  name: path.relative('../app/api', file).replace(/\\/g, '/'),
  load: modules[file],
}))

type Handler = (request: Request, context: { params: Promise<Record<string, string>> }) => Promise<Response>

beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))

describe('routes need a session: the scan', () => {
  it('finds the routes of the app', () => {
    expect(routes.length).toBeGreaterThanOrEqual(10)
  })

  it('has a reason for every public route, and each of them exists', () => {
    const names = routes.map((r) => r.name)
    for (const [route, why] of Object.entries(PUBLIC_ROUTES)) {
      expect(names, `${route} is listed as public but there is no such route`).toContain(route)
      expect(why.length).toBeGreaterThan(10)
    }
  })
})

describe('routes need a session: 401 without one', () => {
  const needSession = routes.filter((r) => !(r.name in PUBLIC_ROUTES))

  for (const route of needSession) {
    it(`/api/${route.name.replace('/route.ts', '')} answers 401 to every method it has`, async () => {
      const mod = await route.load()
      const handlers = METHODS.filter((m) => typeof mod[m] === 'function')
      expect(handlers.length, `${route.name} exports no handler`).toBeGreaterThan(0)
      for (const method of handlers) {
        const handler = mod[method] as Handler
        const body = method === 'GET' || method === 'DELETE' ? undefined : '{}'
        const request = new Request('http://localhost/api/x', { method, body, headers: { 'content-type': 'application/json' } })
        const response = await handler(request, { params: Promise.resolve({ id: 'x', type: 'projects' }) })
        expect(response.status, `${method} /api/${route.name}`).toBe(401)
      }
    })
  }
})
