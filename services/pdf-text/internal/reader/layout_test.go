package reader

import (
	"strings"
	"testing"
)

// A fragment of text of 10 points, one line high, with its left edge at x and its baseline at y.
func frag(text string, x, y float64) fragment {
	return fragment{text: text, left: x, right: x + 5.5*float64(len([]rune(text))), bottom: y, top: y + 10, size: 10}
}

func big(text string, x, y float64) fragment {
	f := frag(text, x, y)
	f.size, f.top, f.right = 14, y+14, x+8*float64(len([]rune(text)))
	return f
}

func TestALineIsWhatSharesABaseline(t *testing.T) {
	// A date far to the right of its title is on the same line: it is not a column of its own.
	got := layoutText([]fragment{frag("2022 – Present", 300, 700), frag("Backend engineer, Logistix", 50, 700.5), frag("Second line", 50, 686)})
	if want := "Backend engineer, Logistix 2022 – Present\nSecond line"; got != want {
		t.Errorf("got %q, want %q", got, want)
	}
}

func TestTheReadingOrderIsTheOneOnThePageNotTheOneOfTheFile(t *testing.T) {
	// The fragments come bottom-up and the bullets before the title: a design tool writes them in any order.
	got := layoutText([]fragment{frag("- last bullet", 50, 650), frag("- first bullet", 50, 680), frag("Job title", 50, 700)})
	if want := "Job title\n- first bullet\n- last bullet"; got != want {
		t.Errorf("got %q, want %q", got, want)
	}
}

func TestASidebarIsReadWholeBeforeTheMainColumn(t *testing.T) {
	// The file alternates between the two columns, line by line.
	var frags []fragment
	for i := 0; i < 5; i++ {
		y := 700 - float64(i)*14
		frags = append(frags, frag("main text line "+string(rune('A'+i)), 220, y), frag("side "+string(rune('a'+i)), 30, y))
	}
	got := layoutText(frags)
	want := "side a\nside b\nside c\nside d\nside e\n\nmain text line A\nmain text line B\nmain text line C\nmain text line D\nmain text line E"
	if got != want {
		t.Errorf("got %q, want %q", got, want)
	}
}

func TestOneColumnWithRaggedLinesIsNotCutInTwo(t *testing.T) {
	var frags []fragment
	for i, text := range []string{"A long line that goes almost to the right margin of the page", "short", "Another rather long line, again going to the margin", "tiny"} {
		frags = append(frags, frag(text, 50, 700-float64(i)*14))
	}
	if got := layoutText(frags); strings.Contains(got, "\n\n") {
		t.Errorf("a single column was cut: %q", got)
	}
}

func TestAColumnOfDatesIsNotAColumn(t *testing.T) {
	// A short title on the left and its dates on the right, line after line, with a wide gap between them: the dates
	// hold too little of the text to be a column of their own.
	var frags []fragment
	for i := 0; i < 4; i++ {
		y := 700 - float64(i)*30
		frags = append(frags, frag("A position with a rather long title number "+string(rune('1'+i)), 50, y), frag("2020", 480, y))
	}
	got := layoutText(frags)
	if strings.Contains(got, "\n\n") || !strings.Contains(got, "number 1 2020") {
		t.Errorf("dates were taken for a column: %q", got)
	}
}

func TestATitleAcrossThePageDoesNotHideTheColumns(t *testing.T) {
	title := frag("A name that runs across the whole width of the page, over both columns of the resume below", 30, 760)
	title.right = 560
	frags := []fragment{title}
	for i := 0; i < 4; i++ {
		y := 700 - float64(i)*14
		frags = append(frags, frag("left column text "+string(rune('a'+i)), 30, y), frag("a line of the main column "+string(rune('A'+i)), 220, y))
	}
	got := layoutText(frags)
	// The title is read first, then the left column whole, then the main one.
	want := "A name that runs across the whole width of the page, over both columns of the resume below\n\n" +
		"left column text a\nleft column text b\nleft column text c\nleft column text d\n\n" +
		"a line of the main column A\na line of the main column B\na line of the main column C\na line of the main column D"
	if got != want {
		t.Errorf("got %q, want %q", got, want)
	}
}

func TestFragmentsThatTouchAreOneWordAndThoseThatDoNotAreTwo(t *testing.T) {
	// A hyphen in another font sits against the word; two words in two fonts have a space between them.
	hyphen := frag("-", 72.5, 700)
	hyphen.right = 75
	word := frag("Pierre", 75.5, 700)
	got := layoutText([]fragment{frag("Jean", 50, 700), hyphen, word, frag("Vernant", 118, 700)})
	if want := "Jean-Pierre Vernant"; got != want {
		t.Errorf("got %q, want %q", got, want)
	}
}

func TestAHeadingAndALargeGapStartAnotherBlock(t *testing.T) {
	got := layoutText([]fragment{
		frag("line one", 50, 700), frag("line two", 50, 686), frag("line three", 50, 672),
		big("EXPERIENCE", 50, 640),
		frag("a job", 50, 620), frag("its bullet", 50, 606),
		frag("another job, far below", 50, 560),
	})
	want := "line one\nline two\nline three\n\nEXPERIENCE\na job\nits bullet\n\nanother job, far below"
	if got != want {
		t.Errorf("got %q, want %q", got, want)
	}
}

func TestNothingToReadIsAnEmptyText(t *testing.T) {
	if got := layoutText(nil); got != "" {
		t.Errorf("got %q", got)
	}
	if got := layoutText([]fragment{frag("   ", 50, 700)}); got != "" {
		t.Errorf("got %q", got)
	}
}
