# src/components/ui

Generic UI primitives — no business logic, no API calls. Styled only with the tokens
of `src/app/globals.css` (see `docs/design/frontend-guidelines.md`). Every one of them
is shown with its variants on `/ui` (development only).

## Files

| File | Description |
|------|-------------|
| `Button.tsx` | `<Button variant? size?>` — `primary` (red), `secondary` (bordered), `ghost`, `danger`; sizes `md`, `sm`. `buttonClasses()` gives the same look to a `<Link>`. |
| `Card.tsx` | `<Card>` — same colour as the page, hairline border, small radius, no shadow. `cardClasses({ interactive })` for a link that is a card. |
| `Badge.tsx` | `<Badge label variant?>` — variants by meaning: `neutral`, `muted`, `accent`, `success`, `warning`, `danger`. |
| `Field.tsx` | `<Field label hint? error?>` — label, control and message tied together (`htmlFor`, `aria-describedby`, `aria-invalid`, error announced with `role="alert"`). |
| `Input.tsx` | `Input`, `Textarea`, `Select` — white controls; inside a `<Field>` they pick up its ids automatically. |
| `Tabs.tsx` | `<Tabs label items value onChange>` — row of exclusive filters; the selected one is announced (`aria-pressed`), optional count in the data font. |
| `Modal.tsx` | `<Modal open onClose title>` — native `<dialog>` (top layer, inert page behind, focus moved in, Escape and backdrop click close it), named close button. |
| `PageHeader.tsx` | `<PageHeader title subtitle? children?>` — page heading with an action slot; actions wrap under the title on phones. |
| `MarkdownContent.tsx` | Renders markdown with the prose styles. |
| `styles.ts` | Shared class strings (`focusRing`). |

Class names are joined with `cn()` from `src/lib/cn.ts` (clsx + tailwind-merge), so a
caller's `className` overrides the defaults.
