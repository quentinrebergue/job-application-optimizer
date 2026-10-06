# src/components/layout

App-shell components, rendered by the route-group layouts in `src/app/(app)/layout.tsx`
(signed-in pages) and `src/app/(public)/layout.tsx` (pages before sign-in).

## Files

| File | Description |
|------|-------------|
| `AppHeader.tsx` | The app's only navigation, at every width: wordmark, sections (`SECTIONS`) as plain links (the current one extra-bold ink, the others regular and muted, same size as the wordmark), separated from the wordmark by a full-height stroke, and the account menu. |
| `AccountMenu.tsx` | Square button with the user's initial opening a Base UI menu: the email ("Signed in as") and "Log out" (calls the `logout` server action). |
| `Wordmark.tsx` | App name with its mark (`Logo`), links to `/`. Used in the app header and the public layout. |
| `Logo.tsx` | The FastResume mark (F-bolt on a red sticker) as inline SVG with the token colours; source and icons in `docs/brand/`. |
| `nav.ts` | `isActiveModule(pathname, mod)`: matches the module's `href` and its `alsoActiveOn` prefixes. |
