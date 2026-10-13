package reader

import (
	"sort"
	"strings"
)

// A fragment is a run of characters on one line with one font, as pdfium gives it, with its place on the page.
// Positions are in points, from the bottom left of the page (top is above bottom).
type fragment struct {
	text                     string
	left, right, bottom, top float64
	size                     float64
}

func (f fragment) midY() float64 { return (f.bottom + f.top) / 2 }
func (f fragment) midX() float64 { return (f.left + f.right) / 2 }

// Tuning of the reading order. Points, or shares of the text.
const (
	// A gap this wide, with no text across it, between two parts of the page makes them two columns...
	minColumnGap = 10.0
	// ...if each side holds at least this share of the text (a column of dates is not a column).
	minColumnShare = 0.2
	// ...and on at least this many lines (a date beside a title is on one line).
	minColumnLines = 3
	// A line starts a new block when it is further from the previous one than this, in times the usual distance
	// between two lines of the column.
	paragraphGap = 1.5
	// A line this much bigger than the usual text is a heading.
	headingScale = 1.15
	// A line whose fragments are no further apart than this share of their height is one line.
	sameLine = 0.5
	// Two fragments that do not touch are two words when the space between them is at least this share of their size
	// (a hyphen set in another font sits a point away from the word: that is not a space).
	wordGap = 0.15
)

// layoutText reads a page the way a person does: the columns one after the other, each from top to bottom, a line
// being what shares a baseline. A PDF stores its text in the order the program wrote it, which for a resume with a
// sidebar is anything: a job's bullets before its title, the skills before the name. The place of each fragment on
// the page is the truth.
//
// The columns are found by the empty bands between them; a page without such a band is one column. An empty line
// separates the columns, a heading from what precedes it, and two lines further apart than a line of text is high.
func layoutText(frags []fragment) string {
	frags = withText(frags)
	if len(frags) == 0 {
		return ""
	}
	usual := usualSize(frags)
	cuts := findCuts(frags)
	if len(cuts) == 0 {
		return columnText(frags, usual)
	}

	// A fragment that crosses a cut (a title across the page, a name above the two columns) belongs to no
	// column: it separates what is above it from what is below, and the columns are read band by band.
	var spanning, rest []fragment
	for _, f := range frags {
		if crosses(f, cuts) {
			spanning = append(spanning, f)
		} else {
			rest = append(rest, f)
		}
	}
	groups := rowsOf(spanning)
	bands := make([][]fragment, len(groups)+1)
	for _, f := range rest {
		b := 0
		for _, g := range groups {
			if g[0].midY() > f.midY() {
				b++
			}
		}
		bands[b] = append(bands[b], f)
	}

	var parts []string
	for i, band := range bands {
		for _, column := range splitAt(band, cuts) {
			parts = append(parts, columnText(column, usual))
		}
		if i < len(groups) {
			parts = append(parts, columnText(groups[i], usual))
		}
	}
	return strings.Join(parts, "\n\n")
}

func crosses(f fragment, cuts []float64) bool {
	for _, cut := range cuts {
		if f.left < cut && f.right > cut {
			return true
		}
	}
	return false
}

// splitAt puts each fragment in the column its middle falls in; empty columns are left out.
func splitAt(frags []fragment, cuts []float64) [][]fragment {
	columns := make([][]fragment, len(cuts)+1)
	for _, f := range frags {
		i := sort.SearchFloat64s(cuts, f.midX())
		columns[i] = append(columns[i], f)
	}
	var out [][]fragment
	for _, c := range columns {
		if len(c) > 0 {
			out = append(out, c)
		}
	}
	return out
}

func withText(frags []fragment) []fragment {
	out := make([]fragment, 0, len(frags))
	for _, f := range frags {
		if strings.TrimSpace(f.text) != "" && f.top > f.bottom {
			out = append(out, f)
		}
	}
	return out
}

// usualSize is the most common size of text, weighted by length: the size of the body, not of a title.
func usualSize(frags []fragment) float64 {
	weight := map[float64]int{}
	for _, f := range frags {
		weight[roundHalf(f.size)] += len([]rune(f.text))
	}
	best, most := 0.0, -1
	for size, n := range weight {
		if n > most || (n == most && size < best) {
			best, most = size, n
		}
	}
	return best
}

func roundHalf(v float64) float64 { return float64(int(v*2+0.5)) / 2 }

// findCuts finds where the page is cut into columns: the empty vertical bands wide enough, between two parts that
// each hold a real share of the text, on several lines. Fragments wider than most of the page (a title across it)
// do not count when looking for a band, nor in the shares: they would hide it.
func findCuts(frags []fragment) []float64 {
	minL, maxR := frags[0].left, frags[0].right
	for _, f := range frags {
		minL, maxR = min(minL, f.left), max(maxR, f.right)
	}
	width := maxR - minL
	var narrow []fragment
	total := 0
	for _, f := range frags {
		if f.right-f.left < 0.6*width {
			narrow = append(narrow, f)
			total += len([]rune(f.text))
		}
	}
	sort.Slice(narrow, func(i, j int) bool { return narrow[i].left < narrow[j].left })

	// The union of the horizontal extents; the gaps between its pieces are the candidate cuts.
	var cuts []float64
	reach := 0.0
	for i, f := range narrow {
		if i == 0 {
			reach = f.right
			continue
		}
		if f.left-reach >= minColumnGap {
			cuts = append(cuts, (reach+f.left)/2)
		}
		reach = max(reach, f.right)
	}

	// Keep the cuts that leave a real share of the text, on several lines, on each side.
	var kept []float64
	for _, cut := range cuts {
		var left, right []fragment
		leftChars, rightChars := 0, 0
		for _, f := range narrow {
			if f.midX() < cut {
				left, leftChars = append(left, f), leftChars+len([]rune(f.text))
			} else {
				right, rightChars = append(right, f), rightChars+len([]rune(f.text))
			}
		}
		if float64(leftChars) >= minColumnShare*float64(total) && float64(rightChars) >= minColumnShare*float64(total) &&
			baselines(left) >= minColumnLines && baselines(right) >= minColumnLines {
			kept = append(kept, cut)
		}
	}

	return kept
}

// baselines counts the distinct lines the fragments sit on.
func baselines(frags []fragment) int {
	ys := make([]float64, 0, len(frags))
	for _, f := range frags {
		ys = append(ys, f.midY())
	}
	sort.Float64s(ys)
	n := 0
	for i, y := range ys {
		if i == 0 || y-ys[i-1] > 3 {
			n++
		}
	}
	return n
}

type line struct {
	text string
	y    float64 // the middle of the line
	size float64
}

// rowsOf groups fragments into lines, from the top: a fragment joins the line it shares a baseline with.
func rowsOf(frags []fragment) [][]fragment {
	sort.SliceStable(frags, func(i, j int) bool { return frags[i].midY() > frags[j].midY() })
	var rows [][]fragment
	for _, f := range frags {
		if n := len(rows); n > 0 {
			ref := rows[n-1][0]
			if abs(f.midY()-ref.midY()) <= sameLine*(ref.top-ref.bottom) {
				rows[n-1] = append(rows[n-1], f)
				continue
			}
		}
		rows = append(rows, []fragment{f})
	}
	return rows
}

func columnText(frags []fragment, usual float64) string {
	rows := rowsOf(frags)

	lines := make([]line, 0, len(rows))
	for _, row := range rows {
		sort.SliceStable(row, func(i, j int) bool { return row[i].left < row[j].left })
		var sb strings.Builder
		l := line{y: row[0].midY()}
		prevRight := row[0].left
		for i, f := range row {
			// A space between two fragments that do not touch and carry none themselves.
			if i > 0 && f.left-prevRight > wordGap*f.size && !strings.HasSuffix(sb.String(), " ") && !strings.HasPrefix(f.text, " ") {
				sb.WriteByte(' ')
			}
			sb.WriteString(f.text)
			prevRight = max(prevRight, f.right)
			l.size = max(l.size, f.size)
		}
		l.text = strings.Join(strings.Fields(sb.String()), " ")
		if l.text != "" {
			lines = append(lines, l)
		}
	}

	pitch := usualPitch(lines)
	var sb strings.Builder
	for i, l := range lines {
		if i > 0 {
			prev := lines[i-1]
			heading := usual > 0 && l.size >= headingScale*usual
			apart := pitch > 0 && prev.y-l.y > paragraphGap*pitch
			if heading || apart {
				sb.WriteByte('\n')
			}
			sb.WriteByte('\n')
		}
		sb.WriteString(l.text)
	}
	return sb.String()
}

// usualPitch is the median distance between two consecutive lines of the column: its line spacing.
func usualPitch(lines []line) float64 {
	if len(lines) < 2 {
		return 0
	}
	gaps := make([]float64, 0, len(lines)-1)
	for i := 1; i < len(lines); i++ {
		gaps = append(gaps, lines[i-1].y-lines[i].y)
	}
	sort.Float64s(gaps)
	return gaps[len(gaps)/2]
}

func abs(v float64) float64 {
	if v < 0 {
		return -v
	}
	return v
}
