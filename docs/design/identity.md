# Identity

The look and feel of the app, decided once so that every screen follows it. If a
choice is not here, ask whether it serves the three words below; if not, leave it
out. Tickets: #59 (this brief), #60 (tokens).

## Personality

**Simple, direct, technical.** The app does one thing: from a job offer to a
tailored resume in a couple of clicks. The interface says what it does in few
words, shows data plainly, and puts the one important action in red.

## What we take from the references

Seven interfaces were collected (screenshots stay on the owner's machine, they
are third-party work). The pattern they share, and that we keep:

| Idea | Seen in | We use it as |
|---|---|---|
| Warm off-white canvas instead of pure white | Harvest, Zapier, MotherDuck | Page background |
| Near-black "ink" and **one** vivid accent | Replay, Zapier, Pietra | Text in ink, everything important in red |
| Headline split in ink and accent | Replay | Page titles may highlight their key words in red |
| Monospace for data and labels | MotherDuck | Scores, dates, ids, small labels |
| Flat surfaces, hairline borders | Zelt, Replay | Borders instead of shadows |

## Color

One accent, everything else neutral. We do not need a secondary color: the
neutrals play that role (roughly 60% canvas, 30% surfaces and text, 10% accent).

| Token | Value | Use |
|---|---|---|
| `canvas` | `#FAF7F2` | Page background |
| `surface` | `#FFFFFF` | Cards, fields, panels |
| `ink` | `#1A1514` | Main text |
| `ink-muted` | `#6B6560` | Secondary text, captions |
| `line` | `#E5DFD6` | Borders and dividers |
| `accent` | `#F71735` | Large display text, underlines, icons, highlights |
| `accent-strong` | `#D60F2C` | Buttons and any small red text |

Functional colors (success, warning, danger) exist only to carry meaning in
status messages and are defined as tokens too; they are never decoration.

**Contrast (measured, WCAG ratio):** ink on canvas 16.9, muted on canvas 5.4,
`accent-strong` on canvas about 5.0, `accent` on canvas 3.8. Normal text needs
4.5, so the lighter `accent` is for large or decorative uses only, and buttons
use `accent-strong` with white text.

Dark mode: not now. Tokens are semantic, so adding it later means defining a
second set of values, not touching components.

## Typography

A direction chosen from the references: one clear sans for almost everything, and
a monospace for data. Both come from Google Fonts through `next/font`, so they
are optimised and self-hosted at build time.

| Role | Font | Notes |
|---|---|---|
| Interface and headings | **Instrument Sans** | Regular and semibold. Replaces Inter, which is the default of generated interfaces |
| Data and small labels | **JetBrains Mono** | Scores, dates, ids, keyboard hints. Never for paragraphs |

## Shape and density

- Flat. Depth comes from the canvas/surface contrast and a 1px `line` border, not
  from shadows.
- Small radius (about 4 to 6 px) on controls and cards. No large rounded corners.
- Compact and information-first: this is a working tool, not a landing page.
  Comfortable spacing, but no decorative empty areas.

## What we do not do

Proposed by the maintainer from what is absent in the references, to be edited
freely.

- No gradients.
- No drop shadows (a focus ring is not a shadow).
- No second brand color.
- No emoji in the interface.
- No decorative icons: an icon appears only when it carries a meaning the text
  does not, and always with an accessible label.
- No sparkle or magic-wand imagery for AI features; they are named for what they
  do ("Recommend experiences"), not for the technology.
- No Inter, no default slate and blue palette.

## Voice

Short sentences, plain verbs, the result before the explanation. "Resume ready.
Download PDF." rather than "Your amazing resume has been successfully generated!".
