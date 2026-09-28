# src/components/ui

Generic UI primitives — no business logic, no API calls. Use these as the base layer for all feature components.

## Files

| File | Description |
|------|-------------|
| `Badge.tsx` | `<Badge label variant?>` — small coloured tag chip. Variants: `blue`, `purple`, `green`, `orange`, `slate`, `red`. |
| `PageHeader.tsx` | `<PageHeader title subtitle? children?>` — consistent page heading with optional action slot (right-aligned). |
| `Modal.tsx` | `<Modal open onClose title? children>` — generic centered modal: backdrop (click to close), Escape-to-close, scrollable body. No business logic; feature components own what they render inside. |
