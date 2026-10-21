import { describe, it, expect } from 'vitest'
import { findLeaks } from './leaks'

const person = { fullName: 'Ada Lovelace', email: 'ada@example.com', phone: '+33 6 12 34 56 78' }

describe('findLeaks', () => {
  it('finds the name, the email and the phone in a request, whatever the accents, the case or the spacing', () => {
    expect(findLeaks(person, 'I am ADA, ada@example.com, 0033-6-12-34-56-78 (336123456780)')).toEqual(['the name (Ada)', 'the email', 'the phone'])
    expect(findLeaks(person, 'call +33612345678 or Lovelace')).toEqual(['the name (Lovelace)', 'the phone'])
    expect(findLeaks({ fullName: 'Éloïse Brûlé' }, 'eloise brule')).toEqual(['the name (Éloïse)', 'the name (Brûlé)'])
  })

  it('finds nothing in a request made safe, and nothing when there is no person', () => {
    expect(findLeaks(person, 'I am [name], [email], [phone]. Backend developer.')).toEqual([])
    expect(findLeaks(undefined, 'ada@example.com')).toEqual([])
  })

  it('does not take a longer word for the name, nor a short word of the name for a leak', () => {
    expect(findLeaks({ fullName: 'Al Ada' }, 'Adaptive systems, al fresco')).toEqual([])
  })
})
