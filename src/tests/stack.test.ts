import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { parse } from 'yaml'

// The local stack: `npm run stack` (scripts/stack.sh) starts what docker-compose.yml describes. These checks keep it
// close to production (the same services, the same hardening), private to the machine (127.0.0.1 only, no secret), and
// consistent with what the app reads.

const root = process.cwd()
type Service = {
  profiles?: string[]
  ports?: string[]
  read_only?: boolean
  cap_drop?: string[]
  security_opt?: string[]
  environment?: Record<string, string>
  depends_on?: Record<string, { condition: string }>
  healthcheck?: { test: string[] }
  restart?: string
}
const compose = parse(fs.readFileSync(path.join(root, 'docker-compose.yml'), 'utf8')) as { services: Record<string, Service> }
const services = compose.services
const script = fs.readFileSync(path.join(root, 'scripts/stack.sh'), 'utf8')

describe('docker-compose.yml', () => {
  it('has the services of production, the database and the migrations', () => {
    expect(Object.keys(services).sort()).toEqual(['ai-gateway', 'app', 'db', 'migrate', 'password-hasher', 'pdf-text', 'resume-renderer'])
    // What production runs, and the folder each is built from.
    for (const dir of ['ai-gateway', 'db-migrator', 'password-hasher', 'pdf-text', 'resume-renderer']) {
      expect(fs.existsSync(path.join(root, 'services', dir, 'Dockerfile')), dir).toBe(true)
    }
  })

  it('starts the AI gateway and the app only when asked: they need a key, or a few minutes of build', () => {
    expect(services['ai-gateway'].profiles).toEqual(['ai'])
    expect(services.app.profiles).toEqual(['app'])
    for (const name of ['db', 'migrate', 'resume-renderer', 'pdf-text', 'password-hasher']) expect(services[name].profiles, name).toBeUndefined()
  })

  it('opens every port on this machine only, each one changeable', () => {
    for (const [name, service] of Object.entries(services)) {
      for (const port of service.ports ?? []) {
        expect(port, `${name} ${port}`).toMatch(/^127\.0\.0\.1:\$\{[A-Z_]+_PORT:-\d+\}:\d+$/)
      }
    }
  })

  it('runs the database first: the migrations wait for it, and the app for both', () => {
    expect(services.db.healthcheck?.test.join(' ')).toContain('pg_isready')
    expect(services.migrate.depends_on?.db.condition).toBe('service_healthy')
    expect(services.migrate.restart).toBe('no')
    expect(services.app.depends_on?.db.condition).toBe('service_healthy')
    expect(services.app.depends_on?.migrate.condition).toBe('service_completed_successfully')
  })

  it('hardens the services as production does: read-only, no capabilities, no new privileges', () => {
    for (const name of ['resume-renderer', 'pdf-text', 'password-hasher', 'ai-gateway']) {
      expect(services[name].read_only, name).toBe(true)
      expect(services[name].cap_drop, name).toEqual(['ALL'])
      expect(services[name].security_opt, name).toContain('no-new-privileges:true')
    }
  })

  it('holds no secret: every key has a default for a laptop, or comes from the environment', () => {
    expect(services.db.environment?.POSTGRES_PASSWORD).toBe('${POSTGRES_PASSWORD:-change-me}')
    expect(services['ai-gateway'].environment?.AI_TOKEN).toBe('${AI_TOKEN:-}')
  })

  it('gives the app container the address of each service by its name in the network', () => {
    const env = services.app.environment!
    expect(env.RESUME_RENDERER_URL).toBe('http://resume-renderer:8080')
    expect(env.PDF_TEXT_URL).toBe('http://pdf-text:8080')
    expect(env.PASSWORD_HASHER_URL).toBe('http://password-hasher:8080')
    expect(env.AI_GATEWAY_URL).toBe('http://ai-gateway:8080')
    expect(env.DATABASE_URL).toContain('@db:5432/job_optimizer')
  })

  it('keeps the limits of the PDF reader and of the hasher of production (k8s/)', () => {
    const k8s = (file: string) => fs.readFileSync(path.join(root, 'k8s', file, 'deployment.yaml'), 'utf8')
    const pdf = services['pdf-text'].environment!
    for (const key of ['MAX_BYTES', 'MAX_PAGES', 'MAX_QUEUE']) expect(k8s('pdf-text'), key).toContain(`value: "${pdf[key]}"`)
    const hasher = services['password-hasher'].environment!
    for (const key of ['BCRYPT_COST', 'MAX_CONCURRENT', 'MAX_QUEUE']) expect(k8s('password-hasher'), key).toContain(`value: "${hasher[key]}"`)
  })
})

describe('scripts/stack.sh', () => {
  it('is valid bash', () => {
    expect(() => execFileSync('bash', ['-n', 'scripts/stack.sh'], { cwd: root })).not.toThrow()
  })

  it('gives the app the same default ports as the compose file, and the variables the app reads', () => {
    for (const [variable, port] of [['DB_PORT', '5433'], ['RENDERER_PORT', '8090'], ['PDF_TEXT_PORT', '8095'], ['HASHER_PORT', '8098'], ['GATEWAY_PORT', '8099'], ['APP_PORT', '3000']]) {
      expect(script, variable).toContain(`${variable} ${port})`)
      expect(JSON.stringify(compose), variable).toContain(`\${${variable}:-${port}}`)
    }
    for (const variable of ['DATABASE_URL', 'RESUME_RENDERER_URL', 'PDF_TEXT_URL', 'PASSWORD_HASHER_URL', 'AI_GATEWAY_URL', 'APP_URL']) {
      expect(script, variable).toContain(`export ${variable}=`)
    }
  })

  it('asks before it replaces or deletes a database, unless told not to', () => {
    expect(script).toMatch(/STACK_YES/)
    expect(script.match(/Type yes to go on/g)?.length).toBe(2)
    // The restore says what a backup of production holds.
    expect(script).toContain('real people')
    // pull goes through restore: the same question, and the keys are never written to disk.
    expect(script).toMatch(/cmd_pull[\s\S]*cmd_restore "\$tmp\/\$name"/)
    expect(script).toContain("trap 'rm -rf \"$tmp\"' EXIT")
  })

  it('has a demo seed that is fictional and bound to one address', () => {
    const seed = fs.readFileSync(path.join(root, 'scripts/demo-seed.sql'), 'utf8')
    expect(seed).toContain("'demo@example.test'")
    expect(seed).not.toMatch(/delete from|drop table|truncate/i)
  })
})
