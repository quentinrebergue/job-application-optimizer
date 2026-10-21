package render

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"testing"

	"github.com/quentinrebergue/job-application-optimizer/services/resume-renderer/internal/templates"
)

var pageObject = regexp.MustCompile(`/Type\s*/Page[^s]`)

// resumeOf builds a resume with n experiences and n projects of `points` bullet lines each.
func resumeOf(n, points int) string {
	bullets := make([]string, points)
	for i := range bullets {
		bullets[i] = fmt.Sprintf("- Built and operated a service handling many requests, improving latency by %d%% across regions with careful monitoring", i*7)
	}
	description := "Owned the platform.\\n" + strings.Join(bullets, "\\n")
	var experiences, projects []string
	for i := 0; i < n; i++ {
		experiences = append(experiences, fmt.Sprintf(`{"title": "Engineer %d", "company": "Acme", "location": "Paris", "period": "%d", "description": "%s"}`, i, 2024-i, description))
		projects = append(projects, fmt.Sprintf(`{"title": "Project %d", "tech": ["Go", "K8s"], "description": "%s"}`, i, description))
	}
	return fmt.Sprintf(`{"schema_version": 1, "template": {"id": "x"}, "profile": {"name": "Ada", "title": "SRE", "email": "a@example.com", "summary": "Hi"},
	"sections": {"experiences": [%s], "projects": [%s], "skills": [{"name": "Languages", "tags": ["Go", "Rust"]}], "education": [{"degree": "MSc", "institution": "EPITA", "period": "2026"}]}}`,
		strings.Join(experiences, ","), strings.Join(projects, ","))
}

func pagesOf(t *testing.T, templateID, body string, options map[string]any) int {
	t.Helper()
	store, err := templates.NewBuiltin()
	if err != nil {
		t.Fatalf("NewBuiltin: %v", err)
	}
	tpl, _ := store.Get(templateID)
	req := decode(t, body)
	req.Template.ID = templateID
	req.Options = options
	resolved, err := templates.ResolveOptions(&tpl.Manifest, req.Options)
	if err != nil {
		t.Fatalf("ResolveOptions: %v", err)
	}
	data, err := BuildData(req, resolved)
	if err != nil {
		t.Fatalf("BuildData: %v", err)
	}
	pdf, err := New(Config{}).Render(context.Background(), tpl.Source, data)
	if err != nil {
		t.Fatalf("Render: %v", err)
	}
	return len(pageObject.FindAll(pdf, -1))
}

// With "fitToPage" on (the default), a resume that would run onto a second page is shrunk to fit one; without it, it
// runs over. A resume too long for any size still runs over: the tightest look is not unreadable.
func TestFitToPage(t *testing.T) {
	requireTypst(t)
	if got := pagesOf(t, "classic", resumeOf(1, 2), nil); got != 1 {
		t.Fatalf("a short resume sanity check: %d pages, want 1", got)
	}
	for _, id := range []string{"classic", "compact"} {
		t.Run(id, func(t *testing.T) {
			long := resumeOf(4, 5)
			if got := pagesOf(t, id, long, map[string]any{"fitToPage": "no"}); got < 2 {
				t.Fatalf("without fitting, the long resume takes %d page(s): the test needs content that overflows", got)
			}
			if got := pagesOf(t, id, long, nil); got != 1 {
				t.Errorf("fitted long resume takes %d pages, want 1", got)
			}
			if got := pagesOf(t, id, resumeOf(1, 2), nil); got != 1 {
				t.Errorf("a short resume takes %d pages, want 1", got)
			}
			if got := pagesOf(t, id, resumeOf(9, 7), nil); got < 2 {
				t.Errorf("a resume too long for any size takes %d page, want more", got)
			}
		})
	}
}
