# src/components/ui

Generic UI primitives — no business logic, no API calls. Styled only with the tokens
of `src/app/globals.css` (see `docs/design/frontend-guidelines.md`). Every one of them
is shown with its variants on `/ui` (development only).

## Files

| File | Description |
|------|-------------|
| `Button.tsx` | `<Button variant? size?>` — `primary` (red fill, ink text), `secondary` (white), `danger`, all with ink stroke and hard shadow that the button moves onto on hover; `ghost` (text only); sizes `md`, `sm`. `buttonClasses()` gives the same look to a `<Link>`. |
| `Card.tsx` | `<Card>` — white sticker: ink stroke, hard shadow. `cardClasses({ interactive })` for a link that is a card (moves onto its shadow on hover). |
| `Badge.tsx` | `<Badge label variant?>` — flat fills by meaning, ink stroke: `neutral`, `muted`, `accent`, `info`, `success`, `warning`, `danger`. |
| `Field.tsx` | `<Field label hint? error?>` — label, control and message tied together (`htmlFor`, `aria-describedby`, `aria-invalid`, error announced with `role="alert"`). |
| `Input.tsx` | `Input`, `Textarea`, `Select` — white controls with ink stroke, hard shadow while focused; inside a `<Field>` they pick up its ids automatically. |
| `Tabs.tsx` | `<Tabs label items value onChange>` — row of exclusive filters; the selected one is a white bordered block with a hard shadow and is announced (`aria-pressed`); optional count in the data font. |
| `Modal.tsx` | `<Modal open onClose title>` — native `<dialog>` (top layer, inert page behind, focus moved in, Escape and backdrop click close it), named close button. |
| `PageHeader.tsx` | `<PageHeader title subtitle? children?>` — page heading with an action slot; actions wrap under the title on phones. |
| `MarkdownContent.tsx` | Renders markdown with the prose styles. |
| `styles.ts` | Shared class strings: `focusRing`, `stroke` (2px ink, 5px radius), `pressable` (hard shadow, moves onto it on hover, off with reduced motion). |

Class names are joined with `cn()` from `src/lib/cn.ts` (clsx + tailwind-merge), so a
caller's `className` overrides the defaults.
