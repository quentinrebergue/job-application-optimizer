package reader

import (
	"context"
	"errors"
	"os"
	"strings"
	"sync"
	"testing"
	"time"
)

var (
	cacheDir string
	shared   *Reader
)

func options() Options {
	return Options{MaxPages: 5, MaxChars: 40000, MinTextChars: 30, MaxQueue: 2, Timeout: 20 * time.Second, CacheDir: cacheDir}
}

// One reader for the tests: compiling the module takes a few seconds, once (the compiled module is kept in a temporary folder).
func TestMain(m *testing.M) {
	var err error
	cacheDir, err = os.MkdirTemp("", "pdf-text-cache")
	if err != nil {
		panic(err)
	}
	shared, err = New(options())
	if err != nil {
		panic(err)
	}
	code := m.Run()
	shared.Close()
	os.RemoveAll(cacheDir)
	os.Exit(code)
}

func read(t *testing.T, name string) Result {
	t.Helper()
	res, err := shared.Text(context.Background(), file(t, name))
	if err != nil {
		t.Fatalf("%s: %v", name, err)
	}
	return res
}

func file(t *testing.T, name string) []byte {
	t.Helper()
	data, err := os.ReadFile("testdata/" + name)
	if err != nil {
		t.Fatal(err)
	}
	return data
}

// lineOf returns the line that holds the text, "" if none.
func lineOf(text, part string) string {
	for _, l := range strings.Split(text, "\n") {
		if strings.Contains(l, part) {
			return l
		}
	}
	return ""
}

func TestReadsAOneColumnResume(t *testing.T) {
	res := read(t, "one-column.pdf")
	for _, want := range []string{"Camille Moreau", "Work Experience", "Ingénieure backend senior", "Logistix", "INSA Lyon", "Kubernetes"} {
		if !strings.Contains(res.Text, want) {
			t.Errorf("the text lacks %q:\n%s", want, res.Text)
		}
	}
	if res.Pages != 1 || res.PagesRead != 1 || res.Truncated {
		t.Errorf("pages = %d read %d truncated %v, want 1, 1, false", res.Pages, res.PagesRead, res.Truncated)
	}
}

func TestAPositionKeepsItsDates(t *testing.T) {
	// The reason pdfium was chosen: a title and its dates stay on the same line.
	line := lineOf(read(t, "one-column.pdf").Text, "Ingénieure backend senior")
	if !strings.Contains(line, "2022") {
		t.Errorf("the line of the position is %q, it should hold its dates", line)
	}
}

func TestTwoColumnsStayWholeWhateverTheOrderOfTheFile(t *testing.T) {
	for _, name := range []string{"two-columns.pdf", "two-columns-reversed.pdf"} {
		text := read(t, name).Text
		// Each column is a block: the three skills lines follow one another, not interleaved with the other column.
		skills := strings.Index(text, "Go, Java, TypeScript, SQL")
		infra := strings.Index(text, "Docker, Kubernetes, Terraform")
		if skills < 0 || infra < 0 || infra-skills > 60 {
			t.Errorf("%s: the skills are not together (%d, %d):\n%s", name, skills, infra, text)
		}
		line := lineOf(text, "Ingénieure backend senior")
		next := text[strings.Index(text, line)+len(line):]
		if !strings.Contains(strings.SplitN(strings.TrimLeft(next, "\n"), "\n", 2)[0], "2022") {
			t.Errorf("%s: the dates do not follow the title %q", name, line)
		}
	}
}

// The file of a design tool: the content is in no reading order (the bullets of a job before its title, the skills
// before the name). The text must come out the way a person reads the page: a sidebar, then the main column.
func TestAResumeWrittenInNoReadingOrderIsReadInReadingOrder(t *testing.T) {
	res := read(t, "sidebar-scrambled.pdf")
	text := res.Text
	order := []string{
		"Camille Moreau", "COMPETENCES", "Go, Java, TypeScript, SQL", "CONTACT",
		"EXPERIENCE", "Ingenieure backend senior - Logistix", "- Conception d'une API", "- Migration d'un monolithe",
		"Ingenieure backend - PayFlow", "- Reduction de 60 %", "FORMATION", "Diplome d'ingenieure", "- Option mathematiques", "Baccalaureat scientifique",
	}
	last := -1
	for _, want := range order {
		i := strings.Index(text, want)
		if i < 0 || i < last {
			t.Fatalf("%q is not where a person reads it (at %d, after %d):\n%s", want, i, last, text)
		}
		last = i
	}
	// The bullets stay under their own title, not under the one of the next job.
	if job := text[strings.Index(text, "Logistix"):strings.Index(text, "PayFlow")]; !strings.Contains(job, "supervision") || strings.Contains(job, "remboursement") {
		t.Errorf("the bullets are not with their job:\n%s", text)
	}
}

func TestAPictureIsNotAText(t *testing.T) {
	if _, err := shared.Text(context.Background(), file(t, "picture.pdf")); !errors.Is(err, ErrNoText) {
		t.Errorf("err = %v, want ErrNoText", err)
	}
}

func TestOnlyTheFirstPagesAreRead(t *testing.T) {
	res := read(t, "twelve-pages.pdf")
	if res.Pages != 12 || res.PagesRead != 5 || !res.Truncated {
		t.Errorf("pages = %d read %d truncated %v, want 12, 5, true", res.Pages, res.PagesRead, res.Truncated)
	}
	if !strings.Contains(res.Text, "page 5") || strings.Contains(res.Text, "page 6") {
		t.Errorf("the text must stop at page 5:\n%s", res.Text)
	}
}

func TestTheTextIsCutAtMaxChars(t *testing.T) {
	small := options()
	small.MaxChars = 1000
	r, err := New(small)
	if err != nil {
		t.Fatal(err)
	}
	defer r.Close()
	res, err := r.Text(context.Background(), file(t, "one-column.pdf"))
	if err != nil {
		t.Fatal(err)
	}
	if n := len([]rune(res.Text)); n != 1000 || !res.Truncated {
		t.Errorf("%d characters, truncated %v; want 1000, true", n, res.Truncated)
	}
}

func TestWhatIsNotAPDFIsRefusedBeforeAnyReading(t *testing.T) {
	if _, err := shared.Text(context.Background(), file(t, "not-a-pdf.txt")); !errors.Is(err, ErrNotPDF) {
		t.Errorf("err = %v, want ErrNotPDF", err)
	}
	if _, err := shared.Text(context.Background(), nil); !errors.Is(err, ErrNotPDF) {
		t.Errorf("an empty file: err = %v, want ErrNotPDF", err)
	}
}

func TestADamagedPDFIsUnreadableNotAWrongText(t *testing.T) {
	if _, err := shared.Text(context.Background(), file(t, "truncated.pdf")); !errors.Is(err, ErrUnreadable) {
		t.Errorf("err = %v, want ErrUnreadable", err)
	}
}

func TestAFileThatTakesTooLongIsStoppedAndTheReaderWorksAfter(t *testing.T) {
	short := options()
	short.Timeout = time.Millisecond // a resume takes longer than this to open
	r, err := New(short)
	if err != nil {
		t.Fatal(err)
	}
	defer r.Close()
	if _, err := r.Text(context.Background(), file(t, "one-column.pdf")); !errors.Is(err, ErrTimeout) {
		t.Fatalf("err = %v, want ErrTimeout", err)
	}
	// The module was closed and a new one started: with a sensible limit the same reader reads again.
	r.opt.Timeout = 20 * time.Second
	res, err := r.Text(context.Background(), file(t, "one-column.pdf"))
	if err != nil || !strings.Contains(res.Text, "Camille Moreau") {
		t.Errorf("after the timeout: %v, %q", err, res.Text)
	}
}

func TestOneFileAtATimeAndPastTheQueueItIsBusy(t *testing.T) {
	r := &Reader{opt: options(), slot: make(chan struct{}, 1), maxWait: 1}
	r.slot <- struct{}{} // the reader is working
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	waiter := make(chan error, 1)
	go func() { waiter <- r.acquire(ctx) }() // takes the one place of the queue
	time.Sleep(50 * time.Millisecond)
	if err := r.acquire(context.Background()); !errors.Is(err, ErrBusy) {
		t.Errorf("the second one waiting: err = %v, want ErrBusy", err)
	}
	cancel()
	if err := <-waiter; !errors.Is(err, context.Canceled) {
		t.Errorf("a waiter whose caller left: err = %v", err)
	}
	if r.waiting.Load() != 0 {
		t.Errorf("waiting = %d after the wait, want 0", r.waiting.Load())
	}
}

func TestSeveralFilesAtOnceAreAllReadOneAfterTheOther(t *testing.T) {
	var wg sync.WaitGroup
	data := file(t, "two-columns.pdf")
	errs := make(chan error, 3)
	for i := 0; i < 3; i++ { // one working and two waiting: MaxQueue is 2
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, err := shared.Text(context.Background(), data)
			errs <- err
		}()
	}
	wg.Wait()
	close(errs)
	for err := range errs {
		if err != nil {
			t.Errorf("a file of three at once: %v", err)
		}
	}
}

func TestTidyMakesTheTextTheSameWhateverTheProgram(t *testing.T) {
	got := tidy("A\r\nB \r\n\r\n\r\n\r\nC\u00a0d \ufb01ne\u0000\u0007 end  ")
	want := "A\nB\n\nC d fine end"
	if got != want {
		t.Errorf("tidy = %q, want %q", got, want)
	}
}
