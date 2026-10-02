# Frontend guidelines

How the frontend code is organised so that it stays modular, reusable and easy to
change. The visual decisions live in [`identity.md`](identity.md). The goal of
these rules: **restyling the app means editing one file, and adding a screen
means assembling existing parts.**

## 1. Three layers, one direction

```
tokens        src/app/globals.css (@theme)     the only place with raw values
   ↓
primitives    src/components/ui/               Button, Field, Card, Heading, Badge...
   ↓
features      src/components/<feature>/        built only from primitives and tokens
   ↓
pages         src/app/**/page.tsx              compose features, fetch data
```

A layer only uses the one above it. A page never styles; a feature never invents
a color; a primitive never knows about jobs or resumes.

## 2. Tokens, not palette classes

- Colors, fonts, radius and spacing are defined once in `@theme` with
  **semantic** names (`canvas`, `surface`, `ink`, `ink-muted`, `line`, `accent`,
  `accent-strong`, `success`, `warning`, `danger`). Tailwind v4 turns them into
  utilities: `bg-canvas`, `text-ink`, `border-line`, `bg-accent-strong`.
- Components use **only** these utilities. No `slate-*`, `blue-*`, `gray-*`, no
  hex values, no arbitrary colors (`bg-[#fff]`). Today there are about 965 such
  raw classes in the components; migrating them is the work of #61 to #66.
- Name by role, not by value: `text-ink-muted`, never `text-gray-500`. A rename
  of the palette then touches one file.
- A check (script or lint rule, ticket #60) fails the CI when a raw palette class
  or color value appears in `src/components` or `src/app`.

## 3. Primitives

- Live in `src/components/ui/`, one file per component, each under about 150
  lines.
- **Variants are explicit and finite**: `variant="primary | secondary | ghost |
  danger"`, `size="sm | md"`. Not a free-form `color` prop. Variants are written
  as a small lookup table next to the component, so every look is visible in one
  place.
- Always accept `className` (merged with a `cn()` helper built on `clsx` and
  `tailwind-merge`, so a caller can override without fighting specificity) and
  spread the remaining props onto the underlying element. In React 19, `ref` is a
  regular prop.
- Use unstyled accessible primitives (Radix UI, React Aria or Base UI) for the
  hard behaviours (dialog, select, popover, tabs), and style them with tokens.
  Never rebuild focus management by hand.
- Accessibility is part of the component: visible focus, keyboard use, labels,
  contrast. A primitive that fails it is not finished.

An example of the intended shape (illustrative):

```tsx
const variants = {
  primary: 'bg-accent-strong text-white hover:bg-accent',
  secondary: 'border border-line bg-surface text-ink hover:bg-canvas',
  ghost: 'text-ink hover:bg-line/40',
  danger: 'bg-danger text-white',
} as const

export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  return <button className={cn(base, variants[variant], className)} {...props} />
}
```

## 4. Feature components

- Compose primitives; they hold the screen's logic, not its styling.
- **Size limit**: a component file stays under about 250 lines; beyond that, split
  it into a container (state and data) and presentational pieces. Today
  `ResumeConfigPanel.tsx` has 1169 lines and is split as part of the jobs
  redesign (#64).
- Keep data fetching and state in hooks (`useTemplates`, ...), so the markup stays
  readable and the hook can be tested alone.
- Props are plain data and callbacks; no component reaches into another's state.

## 5. Making it checkable

- **Size**: extend `src/tests/file-length.test.ts`, which today only counts `.ts`
  files, to `.tsx` with a component limit.
- **Tokens**: the raw-palette check above.
- **Looks**: a script that screenshots each page at phone, tablet and desktop
  widths (#67), so a redesign step can be reviewed and compared.
- **Catalogue**: a small internal page (or Storybook) that shows every primitive
  and variant, so the design system can be reviewed without opening the app.

## 6. Order of work

1. Brief (#59), then tokens (#60): the foundation, nothing visible changes yet.
2. Primitives (#61), then layout and navigation (#62).
3. Pages one group at a time (#63 to #66), each a small PR that removes the raw
   classes of the screens it touches.
4. Never leave a screen half migrated in a merged PR: it either uses tokens or it
   is untouched.
