# src/lib/latex

LaTeX resume generation utilities. Reads templates from `data/resume/`, injects entity content, writes merged `.tex`, and compiles it to PDF.

## Files

| File | Description |
|------|-------------|
| `index.ts` | Barrel export |
| `template.ts` | `getTemplate()` — reads `data/resume/template.tex`; `renderEntityFromTemplate(entity, template)` — substitutes `{{field}}` placeholders for a single entity; `injectEntities(tex, entities, profileText?)` — replaces section-level placeholders using per-section wrappers from `data/resume/sections/` and per-entity templates from `data/resume/entity-templates/`; `saveGeneratedTex(jobId, tex)` — writes merged `.tex` to `data/jobs/{jobId}/generated/resume.tex` |
| `template.test.ts` | Unit tests for `renderEntityFromTemplate` (all entity types, `latex_snippet` fallback, edge cases) |
| `compiler.ts` | `compilePDF(texPath, outputDir)` — spawns `pdflatex`, returns path to generated PDF |

## Data layout

```
data/resume/
  template.tex            — main resume template with %%SECTION%% placeholders
  sections/               — per-type section wrappers (contain %%ITEMS%% placeholder)
    experiences.tex
    projects.tex
    skills.tex
    education.tex
  entity-templates/       — per-entity LaTeX templates (contain {{field}} placeholders)
    experiences.tex
    projects.tex
    skills.tex
    education.tex
```

## Requirements

`pdflatex` must be installed and available on `PATH` (e.g. via TeX Live or MiKTeX).
