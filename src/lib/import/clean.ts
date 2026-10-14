// Cleans the text of a PDF before it is read by the AI (#110). Some programs leave debris in it: a comma or a quote
// on a line of its own, the tail of a letter ("p" of "Japanese" a line below), the number of the page. Each costs
// tokens and lines the model has to skip; none is part of the resume. Measured on 9 real resumes with eval:import.

/** Tokens that are only commas, semicolons or quotes: what is left of a list once its words moved to another line. */
const LOOSE_PUNCTUATION = /^[,;'"`´‘’“”]+$/

/** A line that is nothing but debris: no letter or digit, a page number, one or two lowercase letters. */
function isDebris(line: string): boolean {
  if (!/[\p{L}\p{N}]/u.test(line)) return true
  if (/^\d{1,3}$/.test(line)) return true
  return /^\p{Ll}{1,2}$/u.test(line)
}

export function cleanText(text: string): string {
  return text
    .split('\n')
    .map((line) =>
      line
        .replace(/[\t ]+/g, ' ')
        .split(' ')
        .filter((token) => token !== '' && !LOOSE_PUNCTUATION.test(token))
        .join(' '),
    )
    .filter((line) => line !== '' && !isDebris(line))
    .join('\n')
}
