# data/jobs

Job application entries, created at runtime. Each subdirectory is one job identified by a UUID.

## Job Directory Structure

| File | Description |
|------|-------------|
| `offer.json` | Job metadata: id, title, company, description, status, url, date_added |
| `resume-config.json` | (optional) Selected entity IDs and AI ranking scores for this job's tailored resume |
| `generated/resume.tex` | (optional) Merged LaTeX file, written during PDF generation |
| `generated/resume.pdf` | (optional) Compiled PDF, written after successful `pdflatex` run |

## Status Values

`saved` → `applied` → `interview` → `offer` | `rejected`
