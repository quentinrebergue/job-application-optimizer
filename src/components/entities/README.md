# src/components/entities

Feature components for the Entity Library — browsing, creating, editing, and managing Q&A questions for resume entities (experiences, projects, skills).

## Files

| File | Description |
|------|-------------|
| `EntityCard.tsx` | Clickable card showing entity title/name, type badge, subtitle, and tags. Links to the entity detail page. |
| `EntityForm.tsx` | Controlled form for creating or editing an entity. Renders fields appropriate to the entity type (experience/project/skill) plus shared fields (tags, LaTeX snippet). |
| `QuestionEditor.tsx` | Inline editor for Q&A questions attached to an entity. Supports add, inline edit, and delete. Auto-saves via parent-supplied `onChange` callback. |
