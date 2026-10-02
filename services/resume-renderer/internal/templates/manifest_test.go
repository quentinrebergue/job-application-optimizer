package templates

import (
	"strings"
	"testing"
)

func TestParseManifestValid(t *testing.T) {
	body := `{
	  "id": "classic", "name": "Classic", "schema_version": 1,
	  "options": {
	    "fontSize": {"type": "number", "min": 8, "max": 12, "default": 10.5},
	    "accentColor": {"type": "color", "default": "#1a73e8"},
	    "density": {"type": "enum", "values": ["normal", "tight"], "default": "normal"}
	  }
	}`
	m, err := ParseManifest(strings.NewReader(body))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if m.ID != "classic" || len(m.Options) != 3 {
		t.Errorf("unexpected manifest: %+v", m)
	}
	if m.Options["fontSize"].Min == nil || *m.Options["fontSize"].Min != 8 {
		t.Errorf("fontSize.Min = %v, want 8", m.Options["fontSize"].Min)
	}
	if m.Options["accentColor"].Min != nil {
		t.Errorf("accentColor.Min should be nil (absent), got %v", *m.Options["accentColor"].Min)
	}
}

func TestParseManifestErrors(t *testing.T) {
	tests := []struct {
		name string
		body string
		want string
	}{
		{"not json", `nope`, "decode manifest"},
		{"unknown field", `{"id":"a","name":"A","schema_version":1,"extra":1}`, "decode manifest"},
		{"bad id", `{"id":"../a","name":"A","schema_version":1}`, "manifest id"},
		{"missing name", `{"id":"a","schema_version":1}`, "name is required"},
		{"bad schema version", `{"id":"a","name":"A","schema_version":2}`, "schema_version"},
		{"unknown option type", `{"id":"a","name":"A","schema_version":1,"options":{"x":{"type":"blob","default":1}}}`, "unknown type"},
		{"number default not a number", `{"id":"a","name":"A","schema_version":1,"options":{"x":{"type":"number","default":"big"}}}`, "default must be a number"},
		{"number default below min", `{"id":"a","name":"A","schema_version":1,"options":{"x":{"type":"number","min":5,"default":1}}}`, "at least"},
		{"min greater than max", `{"id":"a","name":"A","schema_version":1,"options":{"x":{"type":"number","min":9,"max":2,"default":5}}}`, "min is greater than max"},
		{"bad color", `{"id":"a","name":"A","schema_version":1,"options":{"x":{"type":"color","default":"blue"}}}`, "color"},
		{"enum without values", `{"id":"a","name":"A","schema_version":1,"options":{"x":{"type":"enum","default":"a"}}}`, "values is required"},
		{"enum default not in values", `{"id":"a","name":"A","schema_version":1,"options":{"x":{"type":"enum","values":["a"],"default":"b"}}}`, "one of"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			_, err := ParseManifest(strings.NewReader(tc.body))
			if err == nil {
				t.Fatal("expected an error, got nil")
			}
			if !strings.Contains(err.Error(), tc.want) {
				t.Errorf("error %q should contain %q", err.Error(), tc.want)
			}
		})
	}
}
