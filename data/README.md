# data

File-system database for the application. All data is stored as JSON or Markdown files. No external database is required.

## Structure

```
data/
├── resume/          # LaTeX template
├── entities/        # Resume entity library
│   ├── experiences/ # Work experience entries
│   ├── projects/    # Project entries
│   └── skills/      # Skill entries
├── jobs/            # Job applications (created at runtime)
├── general-questions/ # Global Q&A flashcards
└── coding/          # Coding interview material
    ├── exercises/   # Coding problems
    └── knowledge/   # Algorithm/DS knowledge base
```

## Conventions

- Every entity, job, exercise, and knowledge item lives in its own subdirectory identified by a short ID (e.g. `exp-001`, `proj-001`).
- JSON files are validated by Zod schemas at read time; malformed files are ignored (return `null`).
- Markdown files (`.md`) are read as raw strings and served as-is to the frontend.
