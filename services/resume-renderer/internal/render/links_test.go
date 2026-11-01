package render

import (
	"fmt"
	"regexp"
	"slices"
	"testing"
)

var uri = regexp.MustCompile(`/URI\(([^)]*)\)`)

// linksOf lists the addresses the links of a PDF point to (Typst writes them in the clear).
func linksOf(pdf []byte) []string {
	var out []string
	for _, m := range uri.FindAllSubmatch(pdf, -1) {
		out = append(out, string(m[1]))
	}
	return out
}

func resumeWithLinks(github, projectURL string) string {
	return fmt.Sprintf(`{"schema_version": 1, "template": {"id": "x"},
	"profile": {"name": "Zoe", "title": "SRE", "email": "z@example.com", "linkedin": "linkedin.com/in/z", "github": %q, "phone": "", "address": "", "summary": ""},
	"sections": {"experiences": [], "skills": [], "education": [],
	  "projects": [
	    {"title": "Linked", "url": %q, "tech": ["Go"], "description": "text\n- a point"},
	    {"title": "Plain", "url": "", "tech": [], "description": "no link"}
	  ]}}`, github, projectURL)
}

// The GitHub address of the profile and the link of a project are clickable in the PDF, and what is empty prints no link (#322).
func TestLinksInTheBuiltinTemplates(t *testing.T) {
	requireTypst(t)
	for _, id := range []string{"classic", "compact"} {
		t.Run(id+"/with both", func(t *testing.T) {
			links := linksOf(renderTemplate(t, id, resumeWithLinks("github.com/zoe", "https://github.com/zoe/app"), nil))
			for _, want := range []string{"https://github.com/zoe", "https://github.com/zoe/app", "https://linkedin.com/in/z", "mailto:z@example.com"} {
				if !slices.Contains(links, want) {
					t.Errorf("no link to %s, links: %v", want, links)
				}
			}
			if len(links) != 4 {
				t.Errorf("%d links, want 4 (the project without a link has none): %v", len(links), links)
			}
		})

		t.Run(id+"/a project address written without its scheme", func(t *testing.T) {
			links := linksOf(renderTemplate(t, id, resumeWithLinks("", "github.com/zoe/bare"), nil))
			if !slices.Contains(links, "https://github.com/zoe/bare") {
				t.Errorf("the link was not completed with https: %v", links)
			}
		})

		t.Run(id+"/nothing set", func(t *testing.T) {
			links := linksOf(renderTemplate(t, id, resumeWithLinks("", ""), nil))
			for _, l := range links {
				if regexp.MustCompile(`github`).MatchString(l) {
					t.Errorf("a GitHub link appears although none was given: %v", links)
				}
			}
			if len(links) != 2 {
				t.Errorf("%d links, want 2 (email, LinkedIn): %v", len(links), links)
			}
		})

		t.Run(id+"/a request from before the fields existed", func(t *testing.T) {
			body := `{"schema_version": 1, "template": {"id": "x"}, "profile": {"name": "Zoe"}, "sections": {"projects": [{"title": "P", "tech": [], "description": ""}]}}`
			if links := linksOf(renderTemplate(t, id, body, nil)); len(links) != 0 {
				t.Errorf("links in a resume that has none: %v", links)
			}
		})
	}
}
