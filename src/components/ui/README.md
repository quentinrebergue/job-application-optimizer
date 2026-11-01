# src/components/ui

Generic UI primitives — no business logic, no API calls. Styled only with the tokens
of `src/app/globals.css` (see `docs/design/frontend-guidelines.md`). Every one of them
is shown with its variants on `/ui` (development only).

## Files

| File | Description |
|------|-------------|
| `Button.tsx` | `<Button variant? size?>` — `primary` (red fill, ink text), `secondary` (white), `danger`, `ai` (violet, the AI action only), all with ink stroke and hard shadow that the button moves onto on hover; `ghost` (text only); sizes `md`, `sm`. `buttonClasses()` gives the same look to a `<Link>`. |
| `Card.tsx` | `<Card>` — white sticker: ink stroke, hard shadow. `cardClasses({ interactive })` for a link that is a card (moves onto its shadow on hover). |
| `Badge.tsx` | `<Badge label variant?>` — flat fills by meaning, ink stroke: `neutral`, `muted`, `accent`, `info`, `success`, `warning`, `danger`. |
| `ConfirmDrawer.tsx` | `<ConfirmDrawer open onOpenChange title description confirmLabel onConfirm>` — asks before a destructive action (delete a job or an entry, reset a resume) in a `Drawer`: Cancel, and the action in red. |
| `Drawer.tsx` | `Drawer`, `DrawerContent`, `DrawerTitle`, `DrawerDescription`, `DrawerFooter`, `DrawerClose` — full-width panel sliding up from the bottom (content in a centred column) for a short decision (e.g. confirm a reset); Base UI (focus, Escape, swipe down), adapted from neobrutalism.dev. |
| `FilterBar.tsx` | `<FilterBar label options value onChange>` — filter over a list: a standalone `SegmentedTabs` bar with counts from 640px, a `SelectMenu` on phones. Its two parts, `FilterSegments` and `FilterSelect`, can be placed apart (the library puts the menu beside its title on a phone). Used by `/jobs` and the library. |
| `Field.tsx` | `<Field label hint? error?>` — label, control and message tied together (`htmlFor`, `aria-describedby`, `aria-invalid`, error announced with `role="alert"`). |
| `Input.tsx` | `Input`, `Textarea`, `Select` — white controls with ink stroke, placeholders at 40% ink (clearly lighter than typed text), hard shadow while focused; inside a `<Field>` they pick up its ids automatically. `Textarea autoGrow` grows with its content instead of scrolling inside. |
| `SegmentedTabs.tsx` | `<SegmentedTabs label items value onChange variant? size? actions?>` — equal joined segments, the selected one filled red and semibold (`aria-pressed`); `tab-bar` (top edge of a card) or `standalone` (bordered, hard shadow); `md` or `sm`; counts, and disabled items with a note in brackets ("Cover letter (Soon)"). `actions` (standalone bars): segments after the choices that act instead of choosing, same size as the others, a link (Add job) or a button that opens something (the search), `accent` fills one like the selected segment. |
| `SelectMenu.tsx` | `SelectMenu`, `SelectMenuTrigger`, `SelectMenuValue`, `SelectMenuContent`, `SelectMenuItem` — select with a styled list, on Base UI (keyboard and screen readers handled), adapted from neobrutalism.dev. Use the native `Select` for plain form fields. |
| `Tabs.tsx` | `<Tabs label items value onChange>` — row of exclusive filters; the selected one is a white bordered block with a hard shadow and is announced (`aria-pressed`); optional count in tabular figures. |
| `Alert.tsx` | `<Alert variant?>` — message block: `danger` (announced at once, `role="alert"`), `success`, `info` (`role="status"`). |
| `Disclosure.tsx` | `<Disclosure title meta? defaultOpen?>` — section that opens and closes; the button sits inside the heading and announces `aria-expanded`; children mount only when open. |
| `IconButton.tsx` | `<IconButton aria-label>` — small square button for an icon or glyph; the accessible name is required. |
| `InfoTip.tsx` | `<InfoTip label>` — a small "i" that opens a short note on hover, focus and tap (Base UI popover); for a sentence or two, never for something needed to use the page. |
| `Modal.tsx` | `<Modal open onClose title>` — native `<dialog>` (top layer, inert page behind, focus moved in, Escape and backdrop click close it), named close button. |
| `SectionTitle.tsx` | `<SectionTitle as level>` — the title of a section: `page` (`text-xl`) or `sub` (`text-lg`), one weight, so the same kind of title looks the same everywhere. Spacing around it comes from the `heading` role. |
| `ResponsiveDialog.tsx` | `<ResponsiveDialog open onClose title size?>` — a narrow (or `wide`, for lists) `Modal` from 768 px of width, a `Drawer` (the bottom sheet, which scrolls) below; nothing is drawn before the page is on the screen (the width is not known to the server), and it is drawn closed then opened a moment later so that the drawer slides in. |
| `PageHeader.tsx` | `<PageHeader title subtitle? children?>` — page heading with an action slot (the Jobs and Resume pages have none: their controls come first, and the title is an invisible `h1` for screen readers); actions wrap under the title on phones. |
| `styles.ts` | Shared class strings: `page` and `pageWidth` (the one page width, 1280px, also the top bar's), `focusRing` and `focusLink` (keyboard focus: yellow, and pressed for a control), `eyebrow` (small capital label), `stroke` (2px ink, 5px radius), `pressable` (hard shadow, moves onto it on hover, or on tap on phones; off with reduced motion). |
| `EditToggle.tsx` | Edit, which becomes Done in the same place while what it edits is open. |

Class names are joined with `cn()` from `src/lib/cn.ts` (clsx + tailwind-merge), so a
caller's `className` overrides the defaults.
