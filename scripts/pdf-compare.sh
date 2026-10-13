#!/usr/bin/env bash
# Reads one PDF with several tools and writes what each one gives, to compare them (#110). Everything runs on this machine
# in Docker: the file is not sent anywhere. A resume is personal data: do not commit the PDFs nor the texts.
#
#   scripts/pdf-compare.sh my-resume.pdf          writes next to it: my-resume.<tool>.txt
#
# poppler-layout   pdftotext -layout: the columns side by side
# poppler          pdftotext: the reading order of poppler (it can mix the columns)
# pdfminer         layout analysis: a block of text per column
# pdfium           the text in the order of the file (what the WebAssembly version used from Go would give)
# For each: the number of characters, the number of lines, and the longest line (a glued text has a very long line).
set -euo pipefail
file="${1:?usage: scripts/pdf-compare.sh file.pdf}"
[ -f "$file" ] || { echo "no such file: $file" >&2; exit 1; }
dir="$(cd "$(dirname "$file")" && pwd)"; name="$(basename "$file" .pdf)"
docker image inspect pdfspike-poppler >/dev/null 2>&1 || {
  printf 'FROM alpine:3.24.2\nRUN apk add --no-cache poppler-utils\n' | docker build -q -t pdfspike-poppler - >/dev/null
}
docker run --rm -v "$dir":/w -w /w -e NAME="$name" pdfspike-poppler sh -c '
  pdftotext -layout -enc UTF-8 -l 5 "$NAME.pdf" "$NAME.poppler-layout.txt" 2>/dev/null || true
  pdftotext -enc UTF-8 -l 5 "$NAME.pdf" "$NAME.poppler.txt" 2>/dev/null || true'
docker run --rm -v "$dir":/w -w /w -e NAME="$name" python:3.13-slim sh -c '
  pip install -q pdfminer.six pypdfium2 >/dev/null 2>&1
  python - <<PY
import os
from pdfminer.high_level import extract_text
import pypdfium2 as pdfium
n = os.environ["NAME"]
try:
    open(n + ".pdfminer.txt", "w").write(extract_text(n + ".pdf", maxpages=5))
except Exception as e:
    open(n + ".pdfminer.txt", "w").write("")
    print("pdfminer:", e)
try:
    pdf = pdfium.PdfDocument(n + ".pdf")
    open(n + ".pdfium.txt", "w").write("\n".join(pdf[i].get_textpage().get_text_range() for i in range(min(len(pdf), 5))))
except Exception as e:
    open(n + ".pdfium.txt", "w").write("")
    print("pdfium:", e)
PY'
printf '%-16s %8s %7s %10s\n' tool characters lines longest
for t in poppler-layout poppler pdfminer pdfium; do
  f="$dir/$name.$t.txt"
  printf '%-16s %8s %7s %10s\n' "$t" "$(wc -c < "$f" | tr -d ' ')" "$(wc -l < "$f" | tr -d ' ')" "$(awk '{ if (length($0) > m) m = length($0) } END { print m + 0 }' "$f")"
done
echo "A text of 30 characters or fewer means a picture, not a text PDF."
