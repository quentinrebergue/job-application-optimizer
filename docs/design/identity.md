# Identity

The look and feel of the app, decided once so that every screen follows it. If a
choice is not here, ask whether it serves the promise below; if not, leave it
out. Tickets: #59 (first brief), #85 (choice of direction), #87 (this version), #90 (fonts).

## Promise and personality

**Fast, direct, confident.** FastResume does one thing: one click to import a
job offer, one to generate the tailored resume, one to download it. The
interface makes the next click obvious.

The style is **neo-brutalism**: thick ink strokes, hard shadows, flat saturated
colours, bold type. Every element looks like a sticker on the page, and anything
clickable looks clickable. It reads as honest and a bit playful, the opposite of
the smooth blue SaaS look of most resume tools.

The interface is expressive; **the generated resume is not**. The PDF keeps a
sober, classic layout: it is what recruiters see.

## How we chose it

Three directions were built side by side on the same elements (#85): the
previous flat hairline style, a tempered neo-brutalism (thick strokes and
shadows on actions only) and full neo-brutalism. The owner chose **full
neo-brutalism**. References: Gumroad's 2021–2022 redesign, FigJam, and the
components of [neobrutalism.dev](https://www.neobrutalism.dev/docs/) (MIT), whose
recipe we adapt.

## Shape

| Element | Rule |
|---|---|
| Stroke | **2px ink** on cards, buttons, controls, badges, navigation items, dialogs |
| Shadow | **hard and offset**: `4px 4px 0 0 ink`, never blurred (`shadow-hard`) |
| Press | a clickable element moves onto its shadow on hover (`translate` by 4px, shadow removed); off with `prefers-reduced-motion` |
| Corners | **5px** (`rounded-control`); no pills, no large radius |
| Dividers | thin `line` colour, only inside dense content (tables, lists in a panel) |

Dense screens (the resume configuration panel) keep their content readable:
thick strokes frame the blocks and the controls, not every row.

## Spacing

Spacing has **roles**, declared once in `globals.css` (`--spacing-*`), so that every gap of one role has one value
(#285). A role may differ between a phone and a computer (the overrides from 768 px), never between two places of
the same view. Use the role utilities (`gap-field`, `p-panel`, `mt-actions`...), not a number, wherever a role fits.

| Role | Phone | Computer | Where |
|---|---|---|---|
| `label` | 4 px | 4 px | a label and its control, a control and its hint (`Field`) |
| `field` | 16 px | 16 px | between the fields of a form |
| `stack` | 16 px | 16 px | between the blocks inside one section, card or dialog; between the cards of a grid |
| `actions` | 8 px | 8 px | extra room above the buttons that end a form or a card |
| `inline` | 12 px | 12 px | between items side by side on one row: buttons, a title and its badge |
| `heading` | 12 px | 16 px | a section title and what it introduces |
| `section` | 24 px | 32 px | between the sections of a page, a panel or a dialog; under a page header |
| `panel` | 16 px | 24 px | inside a large panel (a section of a page, a job's offer or resume) |
| `card` | 16 px | 16 px | inside a card |
| `row` | 12 px | 12 px | inside a dense row, between the rows of a list |
| `dialog` | 16 px | 20 px | inside a dialog or a drawer |
| `gutter` | 16 px | 32 px | the sides of every page, and of the header, the banner and the footer |
| `control` | 12 px | 12 px | the sides inside a field, a menu, an alert or a tab |

Raw values stay for what has no role: an icon beside its text, a row of chips, the size of a button.

**A role name must not be the value of another utility.** `--spacing-block` once made Tailwind read `inline-block`
as `inline-size: 1rem` and crushed the landing page: `src/lib/design-tokens.test.ts` fails on such a collision.

## Text styles

A text style is one class, `text-<role>`: size, line height, weight and tracking together; the colour stays apart
(`text-ink`, `text-ink-muted`). Three weights only: 400 text, 600 labels, 800 titles.

| Role | Size | Weight | Where |
|---|---|---|---|
| `title` | 24 px (30 px from 768 px) | 800 | the title of a page (`PageHeader`, a job) |
| `heading` | 24 px | 800 | a title on a small card (sign in), a big figure |
| `section` | 20 px | 800 | a section of a page (`SectionTitle level="page"`) |
| `subsection` | 18 px | 800 | a part of a panel or a card, the title of a dialog (`SectionTitle`) |
| `item` | 16 px | 800 | the title of a card or of a row of a list |
| `small` | 14 px | 400 | secondary text, most of the interface |
| `small-strong` | 14 px | 600 | the same, emphasised: a link, a message, a name |
| `caption` | 12 px | 400 | a hint, a count, a date |
| `label` | 12 px | 600 | the label of a field, a badge |
| `eyebrow` (styles.ts) | 12 px | 600, capitals | the small label above a group |

`small` and `caption` carry no weight, so an explicit `font-normal` or `font-semibold` next to them always wins. The
landing page keeps its own large, fluid sizes.

## Color

Each colour has a role. Colour never decorates.

| Token | Value | Use |
|---|---|---|
| `canvas` | `#FFE9C7` | Page background (warm peach) |
| `surface` | `#FFFFFF` | Cards, controls, dialogs, neutral badges |
| `panel` | `#FFF6E6` | Large panels (the offer and resume of a job): light enough to read as white, dark enough for white fields and cards inside to stand out |
| `ink` | `#1A1514` | Text, strokes, shadows |
| `ink-muted` | `#4A413C` | Secondary text, captions |
| `line` | `#EBD7B5` | Thin dividers in dense content, muted fills |
| `accent` | `#FF4D50` | **The main action**: primary button fill, active navigation item. Always with ink text |
| `accent-strong` | `#C4122F` | Red text and links on light backgrounds |
| `ai` | `#A388EE` | **AI actions only** ("Rank with AI"): a violet button with ink text, so the AI step is recognisable next to the red main action |
| `info` | `#5294FF` | Status fill: in progress (applied) |
| `warning` | `#FACC00` | Status fill: needs attention (interview). Also **keyboard focus** (#122): the focused control turns yellow and moves onto its shadow, like a press; a link gets the yellow background only. Chosen over a thin red outline, which read as a glitch after closing a menu with Escape |
| `success` | `#05E17A` | Status fill: done, positive (offer) |
| `danger` | `#B00020` | Errors (text) and destructive buttons (white text) |

- **One action colour.** On a screen, red marks the next click; violet marks the
  one AI action. Blue, yellow and green only describe a state (a status badge),
  never an action or a decoration.
- Status fills always carry ink text and a 2px ink stroke.

**Contrast (measured, WCAG ratio; normal text needs 4.5):**

| Text / background | Ratio |
|---|---|
| ink / canvas | 15.3 |
| ink / surface | 18.1 |
| ink-muted / canvas | 8.4 |
| ink-muted / line | 7.1 |
| ink / accent | 5.5 |
| ink / ai | 6.3 |
| ink / info | 6.1 |
| ink / warning | 11.8 |
| ink / success | 10.4 |
| accent-strong / canvas | 5.1 |
| danger / canvas | 6.2 |
| white / danger | 7.3 |
| white / accent | 3.3 (**not allowed**: red buttons use ink text) |

Dark mode: not now. Tokens are semantic, so adding it later means a second set of
values, not touching components.

## Typography

**One family: DM Sans** (#90), the font of neobrutalism.dev: built for
interfaces, very legible in form fields, with real weights up to 1000 (no
browser-faked bold). Loaded once with `next/font`, as a variable font.

| Role | Weight | Utility | Used for |
|---|---|---|---|
| Text | 400 | `font-normal` | Paragraphs, form fields, secondary text |
| Labels | 600 | `font-semibold` | Buttons, field labels, badges, active tabs, small capital labels (`eyebrow`) |
| Titles | 800 | `font-extrabold` | Page, section and card titles, the wordmark |

- No other weight, no italic.
- Dates, counts and scores use **tabular figures** (`tabular-nums`), so numbers line
  up without a monospace font.
- Monospace (the system one, nothing to download) is only for code blocks.

## What we do not do

- No blurred or soft shadows; no gradients.
- No colour used as decoration, no second action colour.
- No large rounded corners or pill shapes.
- No emoji in the interface.
- No decorative icons: an icon appears only when it carries a meaning the text
  does not, and always with an accessible label.
- No sparkle or magic-wand imagery for AI features; they are named for what they
  do ("Rank with AI"), and recognised by their violet, not by an icon.
- No continuous animations (marquees, looping effects). One exception: the product
  demos of the landing page, which play the app's own screens with a drawn cursor.
  The one in the first screen loops; the ones of "How it works" play once, when
  they scroll into view. All have a pause or replay button and, with
  `prefers-reduced-motion`, show their finished picture instead.
- No playful styling in the generated PDF.

## Voice

Short sentences, plain verbs, the result before the explanation. "Resume ready.
Download PDF." rather than "Your amazing resume has been successfully generated!".
