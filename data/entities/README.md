# data/entities

Resume entity library. Contains three subdirectories — one per entity type. Each entity lives in its own directory named by its ID.

## Subdirectories

| Directory | Description |
|-----------|-------------|
| `experiences/` | Work and internship experiences |
| `projects/` | Personal and professional projects |
| `skills/` | Technical and soft skills |

## Entity Directory Structure

Each `{entity-id}/` directory contains:

| File | Description |
|------|-------------|
| `meta.json` | Entity metadata (id, type, title/name, tags, latex_snippet, and type-specific fields). Validated by the appropriate Zod schema on read. |
| `questions.json` | Array of Q&A flashcard objects `{ id, question, answer }` for this entity. Used by the Q&A Trainer. |
