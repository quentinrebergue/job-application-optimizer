package render

import (
	"encoding/json"

	"github.com/quentinrebergue/job-application-optimizer/services/resume-renderer/internal/model"
)

// document is the exact shape of the data.json file the templates read.
type document struct {
	SchemaVersion int            `json:"schema_version"`
	Options       map[string]any `json:"options"`
	Profile       model.Profile  `json:"profile"`
	Sections      model.Section  `json:"sections"`
}

// BuildData produces the data.json handed to a template: the validated request
// plus the resolved options (client values merged with the manifest defaults).
func BuildData(req *model.Request, options map[string]any) ([]byte, error) {
	return json.Marshal(document{
		SchemaVersion: req.SchemaVersion,
		Options:       options,
		Profile:       req.Profile,
		Sections:      normalize(req.Sections),
	})
}

// nonNil turns a nil slice into an empty one. encoding/json writes a nil
// slice as null, and a template calling .len() on null would fail to compile.
func nonNil[T any](s []T) []T {
	if s == nil {
		return []T{}
	}
	return s
}

func normalize(s model.Section) model.Section {
	out := model.Section{
		Experiences: nonNil(s.Experiences),
		Projects:    make([]model.Project, 0, len(s.Projects)),
		Skills:      make([]model.Skill, 0, len(s.Skills)),
		Educations:  nonNil(s.Educations),
	}
	// p and k are copies of the elements, so fixing them does not touch the
	// caller's request.
	for _, p := range s.Projects {
		p.Tech = nonNil(p.Tech)
		out.Projects = append(out.Projects, p)
	}
	for _, k := range s.Skills {
		k.Tags = nonNil(k.Tags)
		out.Skills = append(out.Skills, k)
	}
	return out
}
