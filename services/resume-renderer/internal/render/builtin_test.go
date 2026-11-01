package render

import (
	"bytes"
	"context"
	"maps"
	"slices"
	"testing"

	"github.com/quentinrebergue/job-application-optimizer/services/resume-renderer/internal/templates"
)

const richBody = `{
  "schema_version": 1,
  "template": {"id": "x"},
  "profile": {
    "name": "Zoë Café", "title": "SRE", "email": "z@example.com", "linkedin": "linkedin.com/in/z", "github": "github.com/z",
    "phone": "+33 6 00 00 00 00", "address": "Paris",
    "summary": "Line one.\nLine two with 100% #hashtag $5 [x] *y* _z_ \\ backslash"
  },
  "sections": {
    "experiences": [
      {"title": "SRE", "company": "Acme", "location": "Paris", "period": "2024 - Now", "description": "a\n- b with a very long line that goes on and on so that it wraps onto a second line\n- c\n-5% stays text"},
      {"title": "Intern", "company": "", "location": "", "period": "", "description": ""}
    ],
    "projects": [
      {"title": "App", "url": "https://github.com/z/app", "tech": ["Go", "K8s"], "description": "- d\n- e"},
      {"title": "Mixed", "tech": [], "description": "intro\n- point"},
      {"title": "Bare", "tech": [], "description": ""}
    ],
    "skills": [{"name": "Languages", "tags": ["Go", "TS"]}],
    "education": [{"degree": "MSc", "institution": "EPITA", "period": "2026"}]
  }
}`

const nameOnlyBody = `{"schema_version": 1, "template": {"id": "x"}, "profile": {"name": "Ada"}}`

// optionVariants returns the defaults plus, for every enum option, one
// variant per allowed value, so each branch of a template gets rendered.
func optionVariants(m templates.Manifest) []map[string]any {
	variants := []map[string]any{nil}
	for _, name := range slices.Sorted(maps.Keys(m.Options)) {
		spec := m.Options[name]
		if spec.Type != "enum" {
			continue
		}
		for _, v := range spec.Values {
			variants = append(variants, map[string]any{name: v})
		}
	}
	return variants
}

func TestEveryBuiltinTemplateRenders(t *testing.T) {
	requireTypst(t)
	store, err := templates.NewBuiltin()
	if err != nil {
		t.Fatalf("NewBuiltin: %v", err)
	}
	renderer := New(Config{})

	bodies := map[string]string{"rich": richBody, "name only": nameOnlyBody}
	for _, manifest := range store.List() {
		tpl, _ := store.Get(manifest.ID)
		for bodyName, body := range bodies {
			for _, variant := range optionVariants(manifest) {
				t.Run(manifest.ID+"/"+bodyName+"/"+variantName(variant), func(t *testing.T) {
					req := decode(t, body)
					req.Template.ID = manifest.ID
					req.Options = variant

					options, err := templates.ResolveOptions(&tpl.Manifest, req.Options)
					if err != nil {
						t.Fatalf("ResolveOptions: %v", err)
					}
					data, err := BuildData(req, options)
					if err != nil {
						t.Fatalf("BuildData: %v", err)
					}
					pdf, err := renderer.Render(context.Background(), tpl.Source, data)
					if err != nil {
						t.Fatalf("Render: %v", err)
					}
					if !bytes.HasPrefix(pdf, []byte("%PDF-")) {
						t.Errorf("not a PDF, starts with %q", pdf[:min(8, len(pdf))])
					}
				})
			}
		}
	}
}

func variantName(v map[string]any) string {
	if len(v) == 0 {
		return "defaults"
	}
	for k, val := range v {
		return k + "=" + val.(string)
	}
	return ""
}
