package templates

import (
	"embed"
	"fmt"
	"io/fs"
	"maps"
	"path"
	"slices"
)

//go:embed builtin
var builtinFS embed.FS

type Template struct {
	Manifest Manifest
	Source   []byte
}

// Store is what the rest of the service depends on. Today the only
// implementation reads templates embedded in the binary; a later one could
// serve templates from elsewhere without touching the callers.
type Store interface {
	List() []Manifest
	Get(id string) (*Template, bool)
}

type memoryStore struct {
	byID map[string]*Template
}

func NewBuiltin() (Store, error) {
	return newFromFS(builtinFS, "builtin")
}

func newFromFS(fsys fs.FS, root string) (Store, error) {
	entries, err := fs.ReadDir(fsys, root)
	if err != nil {
		return nil, fmt.Errorf("read templates dir: %w", err)
	}

	byID := make(map[string]*Template)
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		t, err := loadTemplate(fsys, path.Join(root, e.Name()))
		if err != nil {
			return nil, fmt.Errorf("template %q: %w", e.Name(), err)
		}
		if t.Manifest.ID != e.Name() {
			return nil, fmt.Errorf("template %q: manifest id %q does not match its directory", e.Name(), t.Manifest.ID)
		}
		byID[t.Manifest.ID] = t
	}
	if len(byID) == 0 {
		return nil, fmt.Errorf("no templates found in %q", root)
	}
	return &memoryStore{byID: byID}, nil
}

func loadTemplate(fsys fs.FS, dir string) (*Template, error) {
	f, err := fsys.Open(path.Join(dir, "manifest.json"))
	if err != nil {
		return nil, fmt.Errorf("open manifest: %w", err)
	}
	defer f.Close()

	m, err := ParseManifest(f)
	if err != nil {
		return nil, err
	}

	src, err := fs.ReadFile(fsys, path.Join(dir, "main.typ"))
	if err != nil {
		return nil, fmt.Errorf("read main.typ: %w", err)
	}
	return &Template{Manifest: *m, Source: src}, nil
}

func (s *memoryStore) List() []Manifest {
	ids := slices.Sorted(maps.Keys(s.byID))
	out := make([]Manifest, 0, len(ids))
	for _, id := range ids {
		out = append(out, s.byID[id].Manifest)
	}
	return out
}

func (s *memoryStore) Get(id string) (*Template, bool) {
	t, ok := s.byID[id]
	return t, ok
}
