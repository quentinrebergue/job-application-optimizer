# src/app/coding

Coding Interview Trainer module pages.

## Files & Subdirectories

| Path | Description |
|------|-------------|
| `page.tsx` | Server component — loads all exercises and knowledge items, renders `CodingSessionConfig`, an exercise bank grid (`ExerciseCard`), and an expandable knowledge bank (`KnowledgeCard`). |
| `test/page.tsx` | Client component — reads `CodingTestSession` from `sessionStorage`, renders one exercise at a time, top to bottom: problem description → pattern picker (`PatternPicker`) + "Show Full Decision Tree" button (`FullDecisionTreeModal`, blank/unhighlighted until a pattern is picked) → decision tree (`DecisionTreeView`) once a pattern is picked → actions ("Show Solution" until clicked, "Practice More"/"Got It" always available once a pattern is picked — no need to reveal the solution first) → solution steps + code once revealed, at the very bottom. "Got It" removes the exercise from the queue; "Practice More" re-inserts it at a random position, resetting the pattern pick and full-tree modal state. Ends with a completion screen. |

## Session Flow

1. User configures session on `/coding` → `CodingSessionConfig` POSTs to `/api/coding/session`.
2. Server shuffles + filters `Exercise[]` and returns a full `CodingTestSession` (including description and solution).
3. Session stored in `sessionStorage` → client redirected to `/coding/test`.
4. Test page runs the session in memory, updating `sessionStorage` on each interaction.
5. Per exercise: optionally browse the blank `FullDecisionTreeModal` before answering → pick a pattern from `PatternPicker` → `DecisionTreeView` shows the correct root-to-leaf path from `@/config/decisionTree` (with right/wrong feedback), and `FullDecisionTreeModal` now highlights that same path if reopened → "Show Solution" / "Practice More" / "Got It" are all available immediately after picking.
