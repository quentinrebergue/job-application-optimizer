/**
 * How much of a JSON answer is only structure: the characters { } [ ] : , and the
 * quotes around keys and texts. The text inside a string (even a comma or a
 * colon) is content, not structure.
 */
export function countSyntax(value: unknown): { total: number; syntax: number } {
  const json = JSON.stringify(value) ?? ''
  let syntax = 0
  let inString = false
  for (let i = 0; i < json.length; i++) {
    const c = json[i]
    if (inString) {
      if (c === '\\') i++ // an escaped character stays content
      else if (c === '"') { inString = false; syntax++ } // closing quote
    } else if (c === '"') {
      inString = true
      syntax++ // opening quote
    } else if ('{}[]:,'.includes(c)) {
      syntax++
    }
  }
  return { total: json.length, syntax }
}
