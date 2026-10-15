# src/components

Reusable React components. Organised by feature area and a shared `ui/` primitive layer.

## Subdirectories

| Directory | Description |
|-----------|-------------|
| `account/` | The account page: ExportButton, DeleteAccount (#104) |
| `layout/` | App-shell components (Sidebar), the footer of every page (SiteFooter: who it is from and the legal links, no navigation: the top bar has it; always at the bottom of the window) and the legal links in it (LegalLinks) |
| `legal/` | The frame of the text pages: LegalPage, LegalSection |
| `ui/` | Generic UI primitives — Badge, PageHeader |
| `entities/` | The library: LibraryPanel, EntityCard, EntityForm, EntityEditor, entry fields |
| `landing/` | The public landing page: HeroDemo (looping three clicks), HowItWorks with LibraryDemo and JobsDemo (play once on scroll), Promises (only what is true: `promise-list.ts`), Catch, ResumeExample. `demo/` holds the shared engine (`useDemo`, `DemoStage`) |
| `resume/` | The profile editor and the template picker |
