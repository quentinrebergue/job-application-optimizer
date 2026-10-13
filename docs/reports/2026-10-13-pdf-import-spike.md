# Import of a resume in PDF: the spike (#110)

Which tool reads the text of a PDF, where it runs, and what it costs. Measured on 2026-10-13 on a laptop (Docker). No OCR
(a resume that is a picture is detected and refused), as the ticket says.

## The test files

None is a real person's resume: they were made by our own tools, with a fictitious profile.

| File | How it was made | What it tests |
|---|---|---|
| `classic.pdf`, `compact.pdf` | the two templates of the renderer (`POST /render`) | one column, bullets, dates |
| `two.pdf` | Typst directly, a grid with a sidebar (contact, skills, education) and a main column (experience, projects) | **two columns**, the classic trap |
| `scan.pdf` | `two.png` placed in a PDF as an image | a PDF with no text at all |
| `truncated.pdf`, `random.pdf`, `empty.pdf` | `classic.pdf` cut in half; 30 KB of random bytes; an empty file | broken and hostile input |
| `many.pdf` | 60 pages | a page cap |

## Tools tried

| | poppler `pdftotext` 25.12 | Go library `ledongthuc/pdf` |
|---|---|---|
| One column (classic, compact) | clean text, lines and bullets kept | the lines are glued together ("...Lyon, FranceCamille Moreau...") |
| Two columns, default order | **mixed**: the title "Ingénieure backend" falls between "Expérience" and "Contact", the skills slip into the experience | the left column then the right one, by luck of the order inside the file |
| Two columns, `-layout` | **the columns side by side, readable** | not available |
| Scan | 1 character: easy to detect | 0 characters |
| Truncated, random, empty | exit code 1 and a clear message | |
| Time, memory | 0.01 to 0.04 s, 9 MB | 10 ms, 1 to 2 MB of heap |
| From the standard input, no file written | **yes** (`pdftotext -layout -enc UTF-8 -l 5 - -`) | |
| Cap on the pages | **yes** (`-l 5`: 510 characters instead of 6,223 on 60 pages) | |
| Image with the tool (Alpine 3.24 + `poppler-utils`) | **32.9 MB** (Alpine alone 8.3 MB) | about 7 MB (a static Go binary) |

pdfjs (a JavaScript library) was not tried: it would run inside the app, on the thread that serves the pages, on an
untrusted file, which the hashing (#254) and the security of the upload both argue against.

## What it means

- Reading a text PDF costs almost nothing (tens of milliseconds, under 10 MB). The load is not the problem; the **trust** is:
  a PDF is a file made by someone else and the reader is a C library.
- `-layout` is the mode to use: it keeps the structure the AI needs, including two columns. The AI step has to be told that
  a line can hold two columns side by side.
- A resume that is a picture gives no text: the user is told to export a PDF with text (no OCR at first).

## Recommendation

A **small separate service** (`pdf-text`), the pattern of the password-hasher and the renderer: a Go wrapper that runs
`pdftotext` on the bytes it receives, with

- the file size capped (2 MB) and the pages capped (5), a time limit per file (a few seconds), a few files at once;
- no network at all (network policy: only the app may call it, nothing goes out), no service-account token, a read-only
  file system, non-root, the default seccomp profile, a memory limit: a poppler flaw would find nothing to reach;
- nothing written to disk, nothing logged of the text.

The cost is an image of about 33 MB and about 15 to 25 MiB of memory at work, which fits in the margin of the node
(docs/reports/2026-10-13-node-memory.md). The app never opens a PDF.

## Next, in order

1. The service `pdf-text` (Go, Dockerfile, manifests, network policy, CI), deployed with nothing calling it, as for the
   hasher; measured with a scenario of `load/`.
2. The app: upload (size and type checks, a limit per user), call to the service, then the AI structures the text into
   entries (strict schema, the quotas of #203: an import is one AI call), nothing saved yet.
3. The page: the review list (keep, edit, drop each entry) and the save; offered on the empty library.

## To reproduce

```bash
# the PDFs: the renderer for the two templates, Typst for the rest (the renderer's image holds Typst)
curl -s -X POST localhost:8090/render -H 'Content-Type: application/json' --data-binary @req-classic.json -o classic.pdf
docker run --rm -v "$PWD":/w -w /w --entrypoint typst jobapplicationoptimizer-resume-renderer \
  compile --font-path /usr/share/fonts/liberation two.typ two.pdf
# the reading
docker run --rm -v "$PWD":/w -w /w alpine:3.24.2 sh -c 'apk add -q poppler-utils; pdftotext -layout two.pdf -'
```
