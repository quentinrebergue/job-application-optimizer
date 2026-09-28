# src/app/api/coding

API routes for the Coding Interview Trainer.

## Routes

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/coding/session` | Accepts `{ difficulty?: 'easy'\|'medium'\|'hard', count: number }`. Loads all exercises, filters by difficulty if provided, shuffles, and returns a full `CodingTestSession` with `Exercise[]` (including description and solution). |
