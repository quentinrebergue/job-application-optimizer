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

Two more test files: `hard.pdf` (the same two columns, but the main column is written first in the file and the sidebar after
it, placed on the left: the order of the file is not the order of the page) and the PDFs of the first table.

| Tool (licence) | One column | Two columns (`two.pdf`) | `hard.pdf` (file order is not page order) | Scan | Time | Memory | Image |
|---|---|---|---|---|---|---|---|
| **poppler `pdftotext -layout`** (GPL, run as a process) | clean | side by side, readable | side by side, follows the page | 1 char | 10-40 ms | 9 MB per file | 33 MB (Alpine + poppler) |
| poppler, default order | clean | **mixed** | **mixed** | | | | |
| **pdfminer.six** (MIT, Python) | clean | one block per column, by geometry | one block per column, by geometry | 1 char | 33-50 ms | 40 MB (Python) | large (Python) |
| **pdfium** (BSD, via `pypdfium2`) | clean | a block per column, file order | a block per column, file order | 1 char | 4-8 ms | | |
| **pdfium as WebAssembly in Go** (`go-pdfium` + wazero, no C) | clean | a block per column, file order | a block per column, file order | 1 char | ~8 ms a file | **~55 MB** steady, 295 MB while compiling (the garbage is freed with `debug.FreeOSMemory()` after the start) | **11 MB** (static binary) |
| MuPDF `mutool` (**AGPL**) | clean | a block per column | a block per column, file order | | | | |
| pdfjs (Apache, Node) | clean | file order | file order | 0 chars | 87-111 ms, **1.25 s the first time** | heavy runtime | |
| Go library `ledongthuc/pdf` (MIT) | **lines glued** | file order, glued | file order, glued | 0 chars | 10 ms | 1-2 MB | 7 MB |

Broken files: poppler exits with code 1 and a clear message (truncated, random bytes, empty); pdfium as WebAssembly returns an
error ("incorrect format") on a truncated file. Page cap: `pdftotext -l 5` gave 510 characters out of 6,223 on 60 pages.

## What it means

- **Quality no longer separates the tools.** For an AI that sorts a text into sections, what matters is that a column is not
  mixed with the other one: four tools of five keep each column whole. Only poppler in its default order mixes them, and the Go
  library loses the lines. Poppler `-layout` keeps the page, with the columns side by side (the AI has to be told).
- What separates them is the **licence** (MuPDF is AGPL: avoided), the **runtime** (pdfjs and pdfminer bring Node or Python and
  start slowly), the **size and memory**, and the **safety of the reader**.
- Two tools read the file in the order it is written (pdfium, MuPDF, pdfjs); two read the geometry of the page (poppler
  `-layout`, pdfminer). A PDF made by Word, LaTeX or Canva can write its text in another order than the one it shows: this
  is the case our own test files cannot settle, which is why real PDFs are needed (below).
- Reading a text PDF costs almost nothing. The load is not the problem; the **trust** is: a PDF is a file made by someone
  else and the reader is a C or C++ library.

## Two finalists

| | A. poppler `-layout` in a small hardened container | B. pdfium as WebAssembly in a Go binary |
|---|---|---|
| Reader | poppler (C++, GPL, run as a separate process) | pdfium (C++ compiled to WebAssembly, run by wazero) |
| Sandbox | the container: no network, read-only file system, non-root, memory and time limits | the container **and** the WebAssembly memory sandbox inside the process |
| Image | about 33 MB | about 11 MB |
| Memory | about 15 to 25 MiB at work | about 55 MiB steady |
| Start | instant | about 4 s (compiles the module once; the pod is ready after) |
| Order of the text | by the geometry of the page | the order of the file |
| Maintenance | poppler is in every distribution, updated with the base image | a Go dependency (`go-pdfium`, `wazero`), updated with ours |

## Three real PDFs (no personal content in this report)

Three resumes of real people, supplied by the owner, read on this machine with `scripts/pdf-compare.sh`: `a` (one page, a text
with bullets), `b` (a graphic layout with a sidebar, 644 KB), `c` (LaTeX, pdfTeX, two pages).

| Measure | poppler `-layout` | pdfium (file order) | poppler default | pdfminer |
|---|---|---|---|---|
| Lines with a date that also hold the title (a, b, c) | 6/6, 7/7, 9/9 | **6/6, 7/7, 9/9** | 1/6, 7/7, 5/9 | 1/6, 7/7, 5/9 |
| Garbage characters (U+FFFD, private use) | 0 | 0 | 0 | 0 |
| `b`, the graphic layout | **16 of 54 lines hold two columns side by side**: the AI has to separate them | the columns stay whole, in blocks | | blocks, but the title is cut from its date |
| `a`, `c` | clean | clean | the title is cut from its date | the title is cut from its date |

- A reader that cuts a position from its dates (poppler's default order and pdfminer, in half of the cases) is out.
- Between the two finalists the real PDFs favour **pdfium**: it keeps the columns whole where `-layout` leaves two columns on the
  same lines. Three files are a small sample; poppler stays the fallback.

## Choice

**B, pdfium as WebAssembly in a small static Go binary**: 11 MB image, about 55 MiB of memory at work, about 4 s to start (the
module is compiled once; the pod is ready after), about 8 ms a file, a second sandbox (WebAssembly memory) inside the
container. The risk is the dependency (`go-pdfium`, `wazero`): pin the versions and let Dependabot propose updates. Memory
note: compiling the module takes ~295 MB for a moment; `debug.FreeOSMemory()` right after the start brings it to ~50 MB, and
`GOMEMLIMIT` bounds the rest.

Then, whichever is chosen, the pattern is the one of the password-hasher and the renderer: a small separate service, with the
size of the file capped (2 MB), the pages capped (5), a time limit, a few files at once, no network at all, no token, nothing
written to disk, nothing logged of the text. The app never opens a PDF.

## Next, in order

1. (Done) Compare real PDFs, choose B.
2. The service `pdf-text` (Go, Dockerfile, manifests, network policy, CI), deployed with nothing calling it, as for the hasher;
   measured with a scenario of `load/`.
3. The app: upload (size and type checks, a limit per user), call to the service, then the AI structures the text into entries
   (strict schema, the quotas of #203: an import is one AI call), nothing saved yet.
4. The page: the review list (keep, edit, drop each entry) and the save; offered on the empty library.

Not tried: handing the PDF to a model that reads documents (Mistral OCR or a vision model). It would read scans and odd layouts
well, but the whole resume would leave for a third party, which is against the privacy line of the project, and it costs per
page. To weigh later if scans matter.

## To reproduce

```bash
# the PDFs: the renderer for the two templates, Typst for the rest (the renderer's image holds Typst)
curl -s -X POST localhost:8090/render -H 'Content-Type: application/json' --data-binary @req-classic.json -o classic.pdf
docker run --rm -v "$PWD":/w -w /w --entrypoint typst jobapplicationoptimizer-resume-renderer \
  compile --font-path /usr/share/fonts/liberation two.typ two.pdf
# the tools on one file
scripts/pdf-compare.sh two.pdf
```
