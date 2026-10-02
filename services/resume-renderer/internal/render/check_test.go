package render

import (
	"context"
	"testing"
)

func TestVersion(t *testing.T) {
	tr := New(Config{Binary: fakeTypst(t, `echo "typst 9.9.9 (fake)"`)})

	got, err := tr.Version(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != "typst 9.9.9 (fake)" {
		t.Errorf("Version() = %q, want the trimmed output", got)
	}
}

func TestVersionErrors(t *testing.T) {
	tests := []struct {
		name   string
		binary string
	}{
		{"binary exits with an error", fakeTypst(t, "exit 3")},
		{"binary does not exist", "/nonexistent/typst"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if _, err := New(Config{Binary: tc.binary}).Version(context.Background()); err == nil {
				t.Fatal("expected an error, got nil")
			}
		})
	}
}
