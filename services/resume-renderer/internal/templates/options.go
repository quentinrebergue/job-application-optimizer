package templates

import (
	"fmt"
	"maps"
	"slices"
	"strings"
)

// OptionsError reports every problem found in the options sent by a client,
// so the HTTP layer can answer 400 with the full list.
type OptionsError struct {
	Problems []string
}

func (e *OptionsError) Error() string {
	return "invalid options: " + strings.Join(e.Problems, "; ")
}

// ResolveOptions validates the options sent by the client against the template
// manifest and returns the complete set to hand to the template: the client's
// value for each option it sent, the manifest default for the others.
func ResolveOptions(m *Manifest, given map[string]any) (map[string]any, error) {
	var problems []string

	for _, name := range slices.Sorted(maps.Keys(given)) {
		if _, known := m.Options[name]; !known {
			problems = append(problems, fmt.Sprintf("options.%s is not an option of template %q", name, m.ID))
		}
	}

	resolved := make(map[string]any, len(m.Options))
	for _, name := range slices.Sorted(maps.Keys(m.Options)) {
		spec := m.Options[name]
		value, provided := given[name]
		if !provided {
			resolved[name] = spec.Default
			continue
		}
		if err := spec.check(value); err != nil {
			problems = append(problems, fmt.Sprintf("options.%s %v", name, err))
			continue
		}
		resolved[name] = value
	}

	if len(problems) > 0 {
		return nil, &OptionsError{Problems: problems}
	}
	return resolved, nil
}
