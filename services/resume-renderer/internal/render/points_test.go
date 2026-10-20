package render

import (
	"bytes"
	"os"
	"os/exec"
	"path/filepath"
	"testing"

	"github.com/quentinrebergue/job-application-optimizer/services/resume-renderer/internal/templates"
)

// The rule that turns a line starting with a dash into a point of a list lives in the templates themselves
// (a `lines` helper between "// BEGIN lines" and "// END lines"). This test takes the helper out of each template
// as it is shipped and checks it with Typst's own assert: the code tested is the code that renders.
const pointsAssertions = `
#let text-of(items) = ("text", items)
#let list-of(items) = ("list", items)

// Points: a dash, an en dash, an em dash, a bullet or a star, followed by a space.
#assert.eq(groups("- a"), (list-of(("a",)),))
#assert.eq(groups("• x\n* y\n– z\n— w"), (list-of(("x", "y", "z", "w")),))
// Consecutive points make one list; other lines keep their order around it.
#assert.eq(groups("a\n- b\n- c\nd"), (text-of(("a",)), list-of(("b", "c")), text-of(("d",))))
// A point may be indented.
#assert.eq(groups("  - indented"), (list-of(("indented",)),))
// Not points: a negative number (no space after the dash), a dash inside a sentence, a line of dashes, a dash alone.
#assert.eq(groups("-5% of tokens"), (text-of(("-5% of tokens",)),))
#assert.eq(groups("A - B"), (text-of(("A - B",)),))
#assert.eq(groups("---"), (text-of(("---",)),))
#assert.eq(groups("- "), (text-of(("- ",)),))
#assert.eq(groups("2020 – 2022"), (text-of(("2020 – 2022",)),))
// Blank lines stay where they are (as before: a blank line is a blank line); Windows line ends are tolerated.
#assert.eq(groups("a\n\n- b"), (text-of(("a", "")), list-of(("b",))))
#assert.eq(groups("a\r\n- b"), (text-of(("a",)), list-of(("b",))))
// Text without a dash is one run of plain lines, as it was.
#assert.eq(groups("one\ntwo"), (text-of(("one", "two")),))
`

func TestPointsRuleInTheBuiltinTemplates(t *testing.T) {
	requireTypst(t)
	store, err := templates.NewBuiltin()
	if err != nil {
		t.Fatalf("NewBuiltin: %v", err)
	}
	for _, id := range []string{"classic", "compact"} {
		tpl, ok := store.Get(id)
		if !ok {
			t.Fatalf("%s template missing", id)
		}
		start := bytes.Index(tpl.Source, []byte("// BEGIN lines"))
		end := bytes.Index(tpl.Source, []byte("// END lines"))
		if start < 0 || end < start {
			t.Fatalf("%s: the helper between BEGIN lines and END lines is missing", id)
		}
		dir := t.TempDir()
		source := append(append([]byte{}, tpl.Source[start:end]...), []byte(pointsAssertions)...)
		if err := os.WriteFile(filepath.Join(dir, "points.typ"), source, 0o600); err != nil {
			t.Fatal(err)
		}
		cmd := exec.Command("typst", "compile", "points.typ", "points.pdf")
		cmd.Dir = dir
		if out, err := cmd.CombinedOutput(); err != nil {
			t.Errorf("%s: the rule of the points does not hold: %v\n%s", id, err, out)
		}
	}
}
