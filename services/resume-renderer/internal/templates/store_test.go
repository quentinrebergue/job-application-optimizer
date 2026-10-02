package templates

import (
	"strings"
	"testing"
	"testing/fstest"
)

const okManifest = `{"id": "demo", "name": "Demo", "schema_version": 1}`

func TestBuiltinStore(t *testing.T) {
	store, err := NewBuiltin()
	if err != nil {
		t.Fatalf("NewBuiltin: %v", err)
	}

	list := store.List()
	if len(list) == 0 || list[0].ID != "classic" {
		t.Fatalf("List() = %+v, want classic first", list)
	}

	tpl, ok := store.Get("classic")
	if !ok {
		t.Fatal(`Get("classic") not found`)
	}
	if len(tpl.Source) == 0 {
		t.Error("classic template has an empty main.typ")
	}
	if _, ok := tpl.Manifest.Options["fontSize"]; !ok {
		t.Error("classic should declare a fontSize option")
	}

	if _, ok := store.Get("nope"); ok {
		t.Error(`Get("nope") should not be found`)
	}
}

func TestStoreFromFS(t *testing.T) {
	t.Run("valid, listed in id order", func(t *testing.T) {
		fsys := fstest.MapFS{
			"root/zeta/manifest.json":  {Data: []byte(`{"id":"zeta","name":"Z","schema_version":1}`)},
			"root/zeta/main.typ":       {Data: []byte("z")},
			"root/alpha/manifest.json": {Data: []byte(`{"id":"alpha","name":"A","schema_version":1}`)},
			"root/alpha/main.typ":      {Data: []byte("a")},
			"root/README.md":           {Data: []byte("ignored: not a directory")},
		}
		store, err := newFromFS(fsys, "root")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		list := store.List()
		if len(list) != 2 || list[0].ID != "alpha" || list[1].ID != "zeta" {
			t.Errorf("List() = %+v, want [alpha zeta]", list)
		}
	})

	errCases := []struct {
		name string
		fsys fstest.MapFS
		want string
	}{
		{"missing root", fstest.MapFS{}, "read templates dir"},
		{"empty root", fstest.MapFS{"root/README.md": {Data: []byte("x")}}, "no templates found"},
		{"missing manifest", fstest.MapFS{"root/demo/main.typ": {Data: []byte("x")}}, "open manifest"},
		{"missing main.typ", fstest.MapFS{"root/demo/manifest.json": {Data: []byte(okManifest)}}, "read main.typ"},
		{"id differs from directory", fstest.MapFS{
			"root/other/manifest.json": {Data: []byte(okManifest)},
			"root/other/main.typ":      {Data: []byte("x")},
		}, "does not match its directory"},
		{"invalid manifest", fstest.MapFS{
			"root/demo/manifest.json": {Data: []byte(`{"id":"demo"}`)},
			"root/demo/main.typ":      {Data: []byte("x")},
		}, "name is required"},
	}
	for _, tc := range errCases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := newFromFS(tc.fsys, "root")
			if err == nil {
				t.Fatal("expected an error, got nil")
			}
			if !strings.Contains(err.Error(), tc.want) {
				t.Errorf("error %q should contain %q", err.Error(), tc.want)
			}
		})
	}
}
