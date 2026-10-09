/**
 * Keeps what a job offer says about the job and drops what it says about the
 * employer: benefits, salary, "about us", equal-opportunity statements, how to
 * apply. Plain rules, no AI: a section is dropped only under a heading that is
 * clearly about the employer, so an offer with no such heading is left as it is.
 */

// A heading about the job is never dropped, even when it also contains a word below ("About the role").
const JOB_CONTENT = /(responsibilit|requirement|qualification|skills?\b|what you.{0,6}(do|bring|need|will)|you will|your role|the role|this role|about the (role|job|position)|profile|day.to.day|must have|nice to have|tech stack|experience|missions?\b)/i

// A heading about the employer or the process: what follows it, until the next heading, is dropped.
const EMPLOYER = /^(benefits?|perks|what we offer|we offer|our offer|the offer|offer|compensation|salary|pay( and|\s*&)? benefits|remuneration|rémunération|avantages|ce que nous offrons|nous offrons|why (join|work)|about (us|the company|the team|[\p{L}0-9 .&'-]{2,40})|who we are|our (mission|values|culture|story)|company( overview| description)?|diversity|equal opportunit|eeo|privacy|how to apply|application( process)?|next steps|referral|contact|recruitment|hiring|interview process|à propos|qui sommes|processus de recrutement)/iu

const SENTENCES = [
  /[^.\n]*\b(is|are) an? equal[- ]opportunity (employer|workplace)[^.\n]*\./gi,
  /[^.\n]*\bwe (do not|don't) discriminate[^.\n]*\./gi,
  /[^.\n]*\ball qualified applicants will receive consideration[^.\n]*\./gi,
]

const headingText = (line: string) => line.replace(/^#+\s*/, '').replace(/\*\*/g, '').replace(/:\s*$/, '').trim()

function isHeading(line: string): boolean {
  if (/^#{1,4}\s+\S/.test(line) || /^\*\*[^*]{2,80}\*\*:?\s*$/.test(line)) return true
  const short = line.length <= 70 && !/[.!?]$/.test(line)
  const upper = line === line.toUpperCase() && /\p{L}{3}/u.test(line)
  return short && (line.endsWith(':') || upper)
}

const isEmployerHeading = (text: string) => !JOB_CONTENT.test(text) && EMPLOYER.test(text)

export function cleanOffer(offer: string): string {
  const kept: string[] = []
  let skipping = false // under an employer heading: until the next heading
  let skipParagraph = false // after a line such as "Offer: ...": until the next blank line

  for (const raw of offer.split('\n')) {
    const line = raw.trim()
    if (line === '') {
      skipParagraph = false
      kept.push('')
      continue
    }
    if (isHeading(line)) {
      skipping = isEmployerHeading(headingText(line))
      if (!skipping) kept.push(raw)
      continue
    }
    // "Offer: focus on outcomes, relocation support..." or "**Next Steps:** Discuss with HR..."
    const inline = line.replace(/\*\*/g, '').match(/^([\p{L}' &]{2,40}):\s+\S/u)
    if (inline && isEmployerHeading(inline[1])) {
      skipParagraph = true
      continue
    }
    if (!skipping && !skipParagraph) kept.push(raw)
  }

  let text = kept.join('\n')
  for (const sentence of SENTENCES) text = text.replace(sentence, '')
  return text
    .replace(/https?:\/\/\S+/g, '')
    .replace(/(\S) {2,}/g, '$1 ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
