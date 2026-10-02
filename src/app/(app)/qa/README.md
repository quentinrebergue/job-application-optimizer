# src/app/qa

Q&A Flashcard Trainer module pages.

## Files & Subdirectories

| Path | Description |
|------|-------------|
| `page.tsx` | Server component — loads all jobs for the scope selector, then renders `SessionConfig`. Also shows a "how it works" guide. |
| `test/page.tsx` | Client component — reads the active `TestSession` from `sessionStorage`, shows the progress bar, and renders `FlashCard` one card at a time. "Got It" removes the card from the queue; "Practice More" re-inserts it at a random position. Ends with a completion screen. |

## Session Flow

1. User configures session on `/qa` → `SessionConfig` POSTs to `/api/qa/session`.
2. Server builds and shuffles `TestCard[]` from entity Q&A banks + general questions.
3. Session stored in `sessionStorage` → client redirected to `/qa/test`.
4. Test page reads from `sessionStorage` and runs the session in memory, persisting state on each interaction.
