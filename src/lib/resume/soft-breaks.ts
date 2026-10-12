// A word with nothing to break it (a run of letters with no space, a very long identifier, a pasted token) cannot be
// wrapped by Typst: it runs past the margin and off the page. A zero-width space is a place where a line may be
// broken and shows nothing, so it is added inside the words too long to be real, and only there: ordinary text
// goes to the renderer as it was written.

const ZERO_WIDTH_SPACE = '​'

/**
 * A run of this many characters or more, with nothing to break at, is not a word. Only a run longer than a line
 * can overrun the page (a shorter one moves to the next line), and a line holds 85 to 100 characters in the
 * templates; the longest English words have 45 letters. So up to 60 characters nothing is touched.
 */
const LONG_RUN = 61
/** Where the breaks go inside such a run. */
const STEP = 40

// What can already be broken at: white space, a slash, a hyphen or dash (a URL or a compound word wraps by itself),
// and a break added before (so that the function can run twice and give the same text).
const RUN = new RegExp(`[^\\s/\\-–—${ZERO_WIDTH_SPACE}]{${LONG_RUN},}`, 'gu')

const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

/** Whether a run is written in a script that breaks between characters (Chinese, Japanese): left alone. */
const breaksBetweenCharacters = (run: string) => /[⺀-鿿가-힯豈-﫿]/u.test(run)

/** Adds break opportunities inside the words of `text` that are too long to fit a line. */
export function softBreaks(text: string): string {
  return text.replace(RUN, (run) => {
    if (breaksBetweenCharacters(run)) return run
    // By grapheme, so that an emoji or an accent is never cut from its base.
    const characters = Array.from(segmenter.segment(run), (part) => part.segment)
    const pieces: string[] = []
    for (let i = 0; i < characters.length; i += STEP) pieces.push(characters.slice(i, i + STEP).join(''))
    return pieces.join(ZERO_WIDTH_SPACE)
  })
}
