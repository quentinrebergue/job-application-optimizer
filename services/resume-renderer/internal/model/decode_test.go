package model

import (
	"errors"
	"strings"
	"testing"
)

const validBody = `{
  "schema_version": 1,
  "template": {"id": "classic"},
  "options": {"fontSize": 10.5},
  "profile": {"name": "Ada Lovelace", "title": "Engineer", "address": "Paris"},
  "sections": {
    "experiences": [{"title": "SRE", "company": "Acme", "location": "Paris", "period": "2024", "description": "Ran things"}],
    "projects": [{"title": "App", "tech": ["Go", "K8s"], "description": "Built it"}],
    "skills": [{"name": "Languages", "tags": ["Go"]}],
    "education": [{"degree": "MSc", "institution": "EPITA", "period": "2026"}]
  }
}`

func mustDecodeValid(t *testing.T) *Request {
	t.Helper()
	req, err := Decode(strings.NewReader(validBody))
	if err != nil {
		t.Fatalf("validBody should decode: %v", err)
	}
	return req
}

func TestDecodeValid(t *testing.T) {
	req := mustDecodeValid(t)

	if req.SchemaVersion != 1 {
		t.Errorf("SchemaVersion = %d, want 1", req.SchemaVersion)
	}
	if req.Template.ID != "classic" {
		t.Errorf("Template.ID = %q, want %q", req.Template.ID, "classic")
	}
	if req.Profile.Name != "Ada Lovelace" {
		t.Errorf("Profile.Name = %q, want %q", req.Profile.Name, "Ada Lovelace")
	}
	if req.Profile.Address != "Paris" {
		t.Errorf("Profile.Address = %q, want %q", req.Profile.Address, "Paris")
	}
	if len(req.Sections.Experiences) != 1 || req.Sections.Experiences[0].Company != "Acme" {
		t.Errorf("Sections.Experiences = %+v, want one experience at Acme", req.Sections.Experiences)
	}
	if len(req.Sections.Projects) != 1 || len(req.Sections.Projects[0].Tech) != 2 {
		t.Errorf("Sections.Projects = %+v, want one project with two techs", req.Sections.Projects)
	}
	if got := req.Options["fontSize"]; got != 10.5 {
		t.Errorf("Options[fontSize] = %v, want 10.5", got)
	}
}

func TestDecodeErrors(t *testing.T) {
	tests := []struct {
		name string
		body string
	}{
		{"not json", `hello`},
		{"empty body", ``},
		{"unknown field", `{"schema_version": 1, "nope": true}`},
		{"wrong type", `{"schema_version": "one"}`},
		{"sections is an array, not an object", `{"schema_version": 1, "sections": []}`},
		{"trailing data", validBody + `{}`},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req, err := Decode(strings.NewReader(tc.body))
			if err == nil {
				t.Fatalf("expected an error, got request %+v", req)
			}
			if req != nil {
				t.Errorf("expected a nil request on error, got %+v", req)
			}
			var ve *ValidationError
			if !errors.As(err, &ve) {
				t.Errorf("expected a *ValidationError, got %T: %v", err, err)
			}
		})
	}
}

func TestValidate(t *testing.T) {
	tests := []struct {
		name   string
		mutate func(*Request)
		want   string
	}{
		{"wrong schema version", func(r *Request) { r.SchemaVersion = 2 }, "schema_version"},
		{"path traversal in template id", func(r *Request) { r.Template.ID = "../etc" }, "template.id"},
		{"uppercase template id", func(r *Request) { r.Template.ID = "Classic" }, "template.id"},
		{"empty template id", func(r *Request) { r.Template.ID = "" }, "template.id"},
		{"blank name", func(r *Request) { r.Profile.Name = "   " }, "profile.name"},
		{"summary too long", func(r *Request) { r.Profile.Summary = strings.Repeat("x", maxFieldLen+1) }, "profile.summary"},
		{"github address too long", func(r *Request) { r.Profile.GitHub = strings.Repeat("x", maxFieldLen+1) }, "profile.github"},
		{"project link too long", func(r *Request) {
			r.Sections.Projects = []Project{{Title: "P", URL: strings.Repeat("x", maxFieldLen+1)}}
		}, "sections.projects[0].url"},
		{"too many skills", func(r *Request) { r.Sections.Skills = make([]Skill, maxItemsPerSection+1) }, "sections.skills"},
		{"experience description too long", func(r *Request) {
			r.Sections.Experiences[0].Description = strings.Repeat("é", maxFieldLen+1)
		}, "sections.experiences[0].description"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := mustDecodeValid(t)
			tc.mutate(req)

			err := req.Validate()
			var ve *ValidationError
			if !errors.As(err, &ve) {
				t.Fatalf("expected a *ValidationError, got %v", err)
			}
			if !strings.Contains(ve.Error(), tc.want) {
				t.Errorf("error %q should mention %q", ve.Error(), tc.want)
			}
		})
	}
}

func TestValidateCollectsAllProblems(t *testing.T) {
	req := mustDecodeValid(t)
	req.SchemaVersion = 9
	req.Template.ID = "../x"
	req.Profile.Name = ""

	var ve *ValidationError
	if err := req.Validate(); !errors.As(err, &ve) {
		t.Fatalf("expected a *ValidationError, got %v", err)
	}
	if len(ve.Problems) != 3 {
		t.Errorf("got %d problems (%v), want 3", len(ve.Problems), ve.Problems)
	}
}

func TestMultibyteLengthCountsCharacters(t *testing.T) {
	req := mustDecodeValid(t)
	// maxFieldLen characters of a 2-byte rune: over maxFieldLen bytes, but within the limit.
	req.Profile.Summary = strings.Repeat("é", maxFieldLen)
	if err := req.Validate(); err != nil {
		t.Errorf("a summary of exactly %d characters should be accepted: %v", maxFieldLen, err)
	}
}
