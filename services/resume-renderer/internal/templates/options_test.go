package templates

import (
	"errors"
	"strings"
	"testing"
)

func testManifest(t *testing.T) *Manifest {
	t.Helper()
	m, err := ParseManifest(strings.NewReader(`{
	  "id": "classic", "name": "Classic", "schema_version": 1,
	  "options": {
	    "fontSize": {"type": "number", "min": 8, "max": 12, "default": 10.5},
	    "accentColor": {"type": "color", "default": "#1a73e8"},
	    "density": {"type": "enum", "values": ["normal", "tight"], "default": "normal"}
	  }
	}`))
	if err != nil {
		t.Fatalf("test manifest should parse: %v", err)
	}
	return m
}

func TestResolveOptionsDefaults(t *testing.T) {
	got, err := ResolveOptions(testManifest(t), nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got["fontSize"] != 10.5 || got["accentColor"] != "#1a73e8" || got["density"] != "normal" {
		t.Errorf("got %v, want the three manifest defaults", got)
	}
}

func TestResolveOptionsOverrides(t *testing.T) {
	given := map[string]any{"fontSize": 11.0, "density": "tight"}
	got, err := ResolveOptions(testManifest(t), given)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got["fontSize"] != 11.0 || got["density"] != "tight" {
		t.Errorf("client values were not kept: %v", got)
	}
	if got["accentColor"] != "#1a73e8" {
		t.Errorf("accentColor should fall back to its default, got %v", got["accentColor"])
	}
	if len(given) != 2 {
		t.Errorf("the client's map must not be modified, got %v", given)
	}
}

func TestResolveOptionsErrors(t *testing.T) {
	tests := []struct {
		name  string
		given map[string]any
		want  string
	}{
		{"unknown option", map[string]any{"nope": 1.0}, "options.nope is not an option"},
		{"number given as string", map[string]any{"fontSize": "big"}, "options.fontSize must be a number"},
		{"number below min", map[string]any{"fontSize": 4.0}, "options.fontSize must be at least 8"},
		{"number above max", map[string]any{"fontSize": 40.0}, "options.fontSize must be at most 12"},
		{"bad color", map[string]any{"accentColor": "blue"}, "options.accentColor must be a color"},
		{"enum value not allowed", map[string]any{"density": "huge"}, "options.density must be one of: normal, tight"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got, err := ResolveOptions(testManifest(t), tc.given)
			var oe *OptionsError
			if !errors.As(err, &oe) {
				t.Fatalf("expected an *OptionsError, got %v", err)
			}
			if got != nil {
				t.Errorf("expected nil options on error, got %v", got)
			}
			if !strings.Contains(oe.Error(), tc.want) {
				t.Errorf("error %q should contain %q", oe.Error(), tc.want)
			}
		})
	}
}

func TestResolveOptionsCollectsAllProblems(t *testing.T) {
	given := map[string]any{"fontSize": 99.0, "accentColor": "blue", "nope": true}
	_, err := ResolveOptions(testManifest(t), given)

	var oe *OptionsError
	if !errors.As(err, &oe) {
		t.Fatalf("expected an *OptionsError, got %v", err)
	}
	if len(oe.Problems) != 3 {
		t.Errorf("got %d problems (%v), want 3", len(oe.Problems), oe.Problems)
	}
}
