package templates

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"maps"
	"regexp"
	"slices"
	"strings"
)

const SupportedSchemaVersion = 1

var (
	idPattern    = regexp.MustCompile(`^[a-z0-9][a-z0-9-]{0,39}$`)
	colorPattern = regexp.MustCompile(`^#[0-9a-fA-F]{6}$`)
)

type Manifest struct {
	ID            string                `json:"id"`
	Name          string                `json:"name"`
	Description   string                `json:"description"`
	SchemaVersion int                   `json:"schema_version"`
	Options       map[string]OptionSpec `json:"options"`
}

// OptionSpec describes one user-tunable setting of a template. Min, Max and
// Values only apply to some types, so they are optional.
type OptionSpec struct {
	Type    string   `json:"type"` // "number", "color" or "enum"
	Default any      `json:"default"`
	Min     *float64 `json:"min,omitempty"`
	Max     *float64 `json:"max,omitempty"`
	Values  []string `json:"values,omitempty"`
}

func ParseManifest(r io.Reader) (*Manifest, error) {
	var m Manifest
	dec := json.NewDecoder(r)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&m); err != nil {
		return nil, fmt.Errorf("decode manifest: %w", err)
	}
	if err := m.validate(); err != nil {
		return nil, err
	}
	return &m, nil
}

func (m *Manifest) validate() error {
	if !idPattern.MatchString(m.ID) {
		return fmt.Errorf("manifest id %q must match %s", m.ID, idPattern)
	}
	if m.Name == "" {
		return fmt.Errorf("manifest %q: name is required", m.ID)
	}
	if m.SchemaVersion != SupportedSchemaVersion {
		return fmt.Errorf("manifest %q: schema_version must be %d", m.ID, SupportedSchemaVersion)
	}
	// Map iteration order is random in Go: sort the names so the first
	// reported error is always the same.
	for _, name := range slices.Sorted(maps.Keys(m.Options)) {
		if err := m.Options[name].validate(); err != nil {
			return fmt.Errorf("manifest %q: option %q: %w", m.ID, name, err)
		}
	}
	return nil
}
func (s OptionSpec) validate() error {
	switch s.Type {
	case "number":
		if s.Min != nil && s.Max != nil && *s.Min > *s.Max {
			return errors.New("min is greater than max")
		}
	case "enum":
		if len(s.Values) == 0 {
			return errors.New("values is required for an enum")
		}
	case "color":
	default:
		return fmt.Errorf("unknown type %q", s.Type)
	}
	if err := s.check(s.Default); err != nil {
		return fmt.Errorf("default %w", err)
	}
	return nil
}

// check reports whether v is an acceptable value for this option. It is used
// both for the default declared in the manifest and for client-supplied values.
func (s OptionSpec) check(v any) error {
	switch s.Type {
	case "number":
		n, ok := v.(float64)
		if !ok {
			return errors.New("must be a number")
		}
		if s.Min != nil && n < *s.Min {
			return fmt.Errorf("must be at least %v", *s.Min)
		}
		if s.Max != nil && n > *s.Max {
			return fmt.Errorf("must be at most %v", *s.Max)
		}
	case "color":
		c, ok := v.(string)
		if !ok || !colorPattern.MatchString(c) {
			return errors.New("must be a color like #1a73e8")
		}
	case "enum":
		e, ok := v.(string)
		if !ok || !slices.Contains(s.Values, e) {
			return fmt.Errorf("must be one of: %s", strings.Join(s.Values, ", "))
		}
	}
	return nil
}
