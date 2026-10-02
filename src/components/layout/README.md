# src/components/layout

App-shell components, rendered by the route-group layouts in `src/app/(app)/layout.tsx`
(signed-in pages) and `src/app/(public)/layout.tsx` (pages before sign-in).

## Files

| File | Description |
|------|-------------|
| `AppHeader.tsx` | The app's only navigation, at every width: wordmark, links of the enabled modules (`ENABLED_MODULES`, active one underlined in red), email and logout. |
| `Wordmark.tsx` | App name with its red mark, links to `/`. Used in the app header and the public layout. |
| `LogoutButton.tsx` | Form that calls the `logout` server action. |
| `nav.ts` | `isActiveModule(pathname, mod)`: matches the module's `href` and its `alsoActiveOn` prefixes. |
