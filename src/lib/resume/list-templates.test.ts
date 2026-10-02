import { describe, it, expect } from 'vitest'
import { RenderError, listTemplates } from './renderer-client'

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

const serviceReply = {
  templates: [
    {
      id: 'classic',
      name: 'Classic',
      description: 'Single column',
      schema_version: 1,
      options: {
        fontSize: { type: 'number', default: 10.5, min: 8, max: 12 },
        accentColor: { type: 'color', default: '#1a73e8' },
        datePlacement: { type: 'enum', default: 'inline', values: ['inline', 'right'] },
      },
    },
    { id: 'bare', name: 'Bare', description: '', schema_version: 1, options: null },
  ],
}

async function failure(fetchImpl: typeof fetch): Promise<RenderError> {
  try {
    await listTemplates({ baseUrl: 'http://renderer', fetchImpl })
  } catch (err) {
    expect(err).toBeInstanceOf(RenderError)
    return err as RenderError
  }
  throw new Error('expected listTemplates to fail')
}

describe('listTemplates', () => {
  it('returns the templates and their option schemas', async () => {
    let requested = ''
    const fetchImpl: typeof fetch = async (input) => {
      requested = String(input)
      return json(200, serviceReply)
    }

    const templates = await listTemplates({ baseUrl: 'http://renderer:9000', fetchImpl })

    expect(requested).toBe('http://renderer:9000/templates')
    expect(templates.map((t) => t.id)).toEqual(['classic', 'bare'])
    expect(templates[0].options.fontSize).toEqual({ type: 'number', default: 10.5, min: 8, max: 12 })
    expect(templates[0].options.datePlacement.values).toEqual(['inline', 'right'])
  })

  it('treats a template without options (null) as having none', async () => {
    const templates = await listTemplates({ baseUrl: 'http://renderer', fetchImpl: async () => json(200, serviceReply) })
    expect(templates[1].options).toEqual({})
  })

  it('rejects a reply that does not look like a template list', async () => {
    const err = await failure(async () => json(200, { templates: [{ id: 42 }] }))
    expect(err.status).toBe(502)
    expect(err.code).toBe('bad_response')
  })

  it('rejects a reply that is not JSON', async () => {
    const err = await failure(async () => new Response('<html>', { status: 200 }))
    expect(err.code).toBe('bad_response')
  })

  it('maps service errors and an unreachable service like renderPdf does', async () => {
    expect((await failure(async () => json(500, { error: 'internal_error' }))).status).toBe(502)
    const down = await failure(async () => {
      throw new TypeError('fetch failed')
    })
    expect(down.status).toBe(503)
    expect(down.code).toBe('renderer_unreachable')
  })
})
