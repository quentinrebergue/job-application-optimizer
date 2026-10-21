// What changed between two texts, word by word: shows the user where a suggestion differs from what they wrote (#294).

export interface DiffPart {
  text: string
  /** Not in the text it is compared with. */
  changed: boolean
}

/** Words, punctuation marks and the spaces between them, kept apart so the text can be put back together as it was. */
const tokens = (s: string) => s.match(/\s+|[\p{L}\p{N}'’+#/-]+|[^\s\p{L}\p{N}]/gu) ?? []

/**
 * `after` cut in parts, the ones that `before` does not hold marked as changed: the longest run of words in common is
 * kept, what is left of `after` is new. Spaces follow the word before them. Texts are a few hundred words at most.
 */
export function diffWords(before: string, after: string): DiffPart[] {
  const a = tokens(before).filter((t) => !/^\s/.test(t))
  const b = tokens(after)
  const words = b.filter((t) => !/^\s/.test(t))
  // Longest common subsequence of the words.
  const table = Array.from({ length: a.length + 1 }, () => new Array<number>(words.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = words.length - 1; j >= 0; j--) {
      table[i][j] = a[i] === words[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1])
    }
  }
  const same = new Set<number>()
  for (let i = 0, j = 0; i < a.length && j < words.length; ) {
    if (a[i] === words[j]) { same.add(j); i++; j++ }
    else if (table[i + 1][j] >= table[i][j + 1]) i++
    else j++
  }

  const parts: DiffPart[] = []
  let w = 0
  for (const token of b) {
    const isSpace = /^\s/.test(token)
    const changed = !isSpace && !same.has(w)
    if (!isSpace) w++
    // A space joins the part before it, so a run of new words is one part (punctuation counts as a word).
    const last = parts[parts.length - 1]
    if (last && (isSpace || last.changed === changed)) last.text += token
    else parts.push({ text: token, changed })
  }
  return parts
}
