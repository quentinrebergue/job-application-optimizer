# data/coding/exercises

Coding exercise library. Each subdirectory is one problem identified by its ID.

## Exercise Directory Structure

| File | Description |
|------|-------------|
| `meta.json` | Exercise metadata: id, title, difficulty, knowledge_ids (linked knowledge items), `category` (pattern — must match a `Pattern` from `@/config/decisionTree`, powers the pattern picker + decision tree view on `/coding/test`), optional `patternJustifications` (per-node text overrides keyed by decision-tree node id) |
| `description.md` | Problem statement in Markdown |
| `solution/steps.md` | Step-by-step solution approach in Markdown |
| `solution/code.py` | Reference solution in Python |

## Seed Data

| ID | Title | Difficulty |
|----|-------|-----------|
| `ex-001` | Two Sum | easy |
| `ex-002` | Max Average Subarray I | medium |
