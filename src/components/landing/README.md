# src/components/landing

The public landing page.

| File | Description |
|---|---|
| `HeroDemo.tsx` | The top of the page: the three clicks played in a loop, with what the AI picks from a sample library |
| `HowItWorks.tsx` | The three steps, each with a demo that plays once when it scrolls into view |
| `LibraryDemo.tsx` | Step one: filling the library |
| `JobsDemo.tsx` | Step two: adding an offer and following it in the list |
| `ResumeDemo.tsx` | Step three: the ranking, then the resume |
| `ResumeExample.tsx` | The entries the AI picked in the hero demo, as they read on the resume |
| `Why.tsx`, `Catch.tsx` | Why the product exists; the honest answer to "what is the catch?" |
| `Promises.tsx` | The promises as cards |
| `promise-list.ts` | What is promised: shown only once the charter says it is true |
| `ai-copy.ts` | The sentence about the AI, true only as far as the provider settings go |
| `demo/` | The shared part of the demos: `DemoStage.tsx` (frame, cursor, pause), `drawn.tsx` (fields and buttons drawn as in the app), `useDemo.ts` (the script: wait, move, press, type) |

Each `*.test.ts` tests the file of the same name.
