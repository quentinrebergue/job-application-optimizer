# src/components/qa

Feature components for the Q&A Flashcard Trainer module.

## Files

| File | Description |
|------|-------------|
| `SessionConfig.tsx` | Session configuration form — question count picker, scope selector (all or job-specific), job dropdown. On submit, calls `POST /api/qa/session`, stores the resulting `TestSession` in `sessionStorage`, then navigates to `/qa/test`. Also exports the `SESSION_KEY` constant used by the test page. |
| `FlashCard.tsx` | Single flashcard UI — shows the question, a "Show Answer" button, then the answer with "Got It" / "Practice More" assessment buttons. Stateless; all logic is driven by the parent. |
