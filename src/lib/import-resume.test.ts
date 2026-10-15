import { describe, it, expect } from 'vitest'
import { IMPORT_MAX_BYTES, checkFile, errorMessage, groupByKind, groupTitle, profileRows, report, sendResume, withEntry, withoutEntry, type ImportResult } from './import-resume'
import type { EntityMeta } from '@/types'

const none = { added: 0, duplicates: 0, overCap: 0 }
const result = (over: Partial<ImportResult['summary']> = {}, rest: Partial<ImportResult> = {}): ImportResult => ({
  summary: { experiences: none, projects: none, education: none, skills: none, ...over },
  entries: [],
  existing: [],
  dropped: 0,
  truncated: false,
  ...rest,
})

describe('checkFile', () => {
  const pdf = { name: 'cv.pdf', type: 'application/pdf', size: 100_000 }

  it('lets a PDF through, even when the browser does not name its type', () => {
    expect(checkFile(pdf)).toBeNull()
    expect(checkFile({ ...pdf, type: '', name: 'Resume.PDF' })).toBeNull()
  })

  it('refuses what is not a PDF, an empty file and a file over the size limit, and says so', () => {
    expect(checkFile({ name: 'cv.docx', type: 'application/vnd.openxmlformats', size: 1000 })).toBe('Choose a PDF file.')
    expect(checkFile({ ...pdf, size: 0 })).toBe('This file is empty.')
    expect(checkFile({ ...pdf, size: IMPORT_MAX_BYTES })).toBeNull()
    expect(checkFile({ ...pdf, size: IMPORT_MAX_BYTES + 1 })).toBe('This PDF is too large: 2 MB at most.')
  })
})

describe('report', () => {
  it('says what was added, in the right number', () => {
    expect(report(result({ experiences: { ...none, added: 1 } })).headline).toBe('Added 1 experience.')
    expect(report(result({ experiences: { ...none, added: 2 }, education: { ...none, added: 1 } })).headline).toBe('Added 2 experiences and 1 degree.')
    const all = report(result({ experiences: { ...none, added: 1 }, projects: { ...none, added: 3 }, education: { ...none, added: 2 }, skills: { ...none, added: 4 } }))
    expect(all.headline).toBe('Added 1 experience, 3 projects, 2 degrees and 4 skills.')
    expect(all.total).toBe(10)
    expect(all.notes).toEqual([])
  })

  it('says when there is nothing new; the entries already in the library are listed, not counted in a note', () => {
    const r = report(result({ projects: { added: 0, duplicates: 3, overCap: 0 } }))
    expect(r.headline).toBe('Nothing new to add.')
    expect(r.total).toBe(0)
    expect(r.notes).toEqual([])
  })

  it('explains what the caps of the library kept out, kind by kind', () => {
    const r = report(result({ projects: { added: 6, duplicates: 0, overCap: 2 }, skills: { added: 0, duplicates: 0, overCap: 5 } }))
    expect(r.notes).toEqual([
      'Your library is full for projects: 2 not added. Delete some to make room.',
      'Your library is full for skills: 5 not added. Delete some to make room.',
    ])
  })


  it('does not report what the checks dropped: a count the user cannot act on', () => {
    expect(report(result({ experiences: { ...none, added: 1 } }, { dropped: 3 })).notes).toEqual([])
  })
})

describe('errorMessage', () => {
  it('shows the message of the API, which is written for the user', () => {
    expect(errorMessage(422, { error: 'No text found in this PDF: it may be a picture.' })).toBe('No text found in this PDF: it may be a picture.')
  })

  it('answers for the network in front of the API, which sends no JSON', () => {
    expect(errorMessage(413, null)).toBe('This PDF is too large (2 MB at most).')
    expect(errorMessage(504, null)).toMatch(/took too long/)
    expect(errorMessage(500, null)).toBe('The import failed. Try again.')
  })

  it('sends an expired session to sign in again, whatever the body says', () => {
    expect(errorMessage(401, { error: 'Unauthorized' })).toBe('Your session has expired. Sign in again.')
  })
})

describe('sendResume', () => {
  const file = new Blob(['%PDF-1.7'], { type: 'application/pdf' })
  const reply = (status: number, body: unknown) => async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status })

  it('posts the PDF itself and returns what the API answered', async () => {
    const calls: { url: string; init: RequestInit }[] = []
    const fetchImpl = (async (url: string, init: RequestInit) => {
      calls.push({ url, init })
      return reply(200, result({ experiences: { ...none, added: 1 } }))()
    }) as unknown as typeof fetch
    const out = await sendResume(file, { fetchImpl })
    expect(out.ok && out.result.summary.experiences.added).toBe(1)
    expect(calls[0].url).toBe('/api/import/resume')
    expect(calls[0].init).toMatchObject({ method: 'POST', body: file, headers: { 'content-type': 'application/pdf' } })
  })

  it('turns a refusal into its message', async () => {
    const out = await sendResume(file, { fetchImpl: reply(422, { error: 'No text found in this PDF.', code: 'no_text' }) as unknown as typeof fetch })
    expect(out).toEqual({ ok: false, message: 'No text found in this PDF.' })
  })

  it('turns an answer that is not JSON (the ingress refusing a body) into a message', async () => {
    const out = await sendResume(file, { fetchImpl: reply(413, '<html>413</html>') as unknown as typeof fetch })
    expect(out).toEqual({ ok: false, message: 'This PDF is too large (2 MB at most).' })
  })

  it('says so when the network fails or the call never ends', async () => {
    const offline = (async () => { throw new TypeError('Failed to fetch') }) as unknown as typeof fetch
    expect(await sendResume(file, { fetchImpl: offline })).toEqual({ ok: false, message: 'The import could not be sent. Check your connection and try again.' })
    const slow = (async () => { throw new DOMException('timed out', 'TimeoutError') }) as unknown as typeof fetch
    expect(await sendResume(file, { fetchImpl: slow })).toEqual({ ok: false, message: 'The import took too long. Try again.' })
  })

  it('does not take an answer without a summary for a success', async () => {
    const out = await sendResume(file, { fetchImpl: reply(200, { hello: 'world' }) as unknown as typeof fetch })
    expect(out.ok).toBe(false)
  })
})

describe('the entries the import created', () => {
  const entry = (type: string, id: string, extra: object = {}) => ({ id, type, ...extra }) as unknown as EntityMeta
  const entries = [
    entry('skills', 's1', { name: 'Go' }),
    entry('experiences', 'e1', { title: 'Engineer' }),
    entry('skills', 's2', { name: 'SQL' }),
    entry('education', 'd1', { degree: 'MSc' }),
  ]

  it('groups them by kind, in the order of the library, leaving out the kinds with none', () => {
    expect(groupByKind(entries).map((g) => [g.kind, g.entries.map((e) => e.id)])).toEqual([
      ['experiences', ['e1']],
      ['education', ['d1']],
      ['skills', ['s1', 's2']],
    ])
    expect(groupByKind([])).toEqual([])
  })

  it('titles a group with the right number', () => {
    expect(groupTitle('experiences', 1)).toBe('1 experience')
    expect(groupTitle('skills', 2)).toBe('2 skills')
  })

  it('removes a deleted entry and only that one', () => {
    expect(withoutEntry(entries, 's1').map((e) => e.id)).toEqual(['e1', 's2', 'd1'])
    expect(withoutEntry(entries, 'nope')).toHaveLength(4)
  })

  it('shows an entry as last saved, keeping the fields the answer does not hold', () => {
    const out = withEntry(entries, entry('experiences', 'e1', { title: 'Lead engineer' }))
    expect(out[1]).toMatchObject({ id: 'e1', title: 'Lead engineer' })
    expect(out).toHaveLength(4)
    expect(withEntry(entries, entry('skills', 'zz'))).toEqual(entries)
  })
})

describe('profileRows', () => {
  it('lists every field of the profile in the order of the form, null where it is empty', () => {
    const rows = profileRows({ full_name: 'Camille Moreau', email: '', phone: '  ', linkedin: 'in/camille', address: '', resume_title: 'Engineer', profile_text: '' } as never)
    expect(rows.map((r) => r.key)).toHaveLength(7)
    expect(rows.map((r) => r.label)).toEqual(['Name', 'Email', 'Phone', 'LinkedIn', 'Address', 'Resume title', 'Profile'])
    // A missing field says which one it is.
    expect(rows.filter((r) => r.value === null).map((r) => r.missing)).toEqual(['No email found', 'No phone found', 'No address found', 'No profile text found'])
    expect(rows.map((r) => r.value)).toEqual(['Camille Moreau', null, null, 'in/camille', null, 'Engineer', null])
  })
})
