package model

import (
	"fmt"
	"regexp"
	"strings"
	"unicode/utf8"
)

const (
	SchemaVersion      = 1
	maxItemsPerSection = 50
	maxFieldLen        = 5000
)

var templateIDPattern = regexp.MustCompile(`^[a-z0-9][a-z0-9-]{0,39}$`)

type ValidationError struct {
	Problems []string
}

func (e *ValidationError) Error() string {
	return "invalid payload: " + strings.Join(e.Problems, "; ")
}

type validator struct {
	problems []string
}

func (v *validator) addf(format string, args ...any) {
	v.problems = append(v.problems, fmt.Sprintf(format, args...))
}

func (v *validator) maxLen(field, value string) {
	if utf8.RuneCountInString(value) > maxFieldLen {
		v.addf("%s is too long (max %d characters)", field, maxFieldLen)
	}
}

func (v *validator) maxItems(field string, n int) {
	if n > maxItemsPerSection {
		v.addf("%s has too many items (max %d)", field, maxItemsPerSection)
	}
}

func (r *Request) Validate() error {
	v := &validator{}

	if r.SchemaVersion != SchemaVersion {
		v.addf("schema_version must be %d", SchemaVersion)
	}
	if !templateIDPattern.MatchString(r.Template.ID) {
		v.addf("template.id must match %s", templateIDPattern)
	}
	if strings.TrimSpace(r.Profile.Name) == "" {
		v.addf("profile.name is required")
	}

	p := r.Profile
	for _, f := range []struct{ name, value string }{
		{"profile.name", p.Name},
		{"profile.title", p.Title},
		{"profile.email", p.Email},
		{"profile.linkedin", p.LinkedIn},
		{"profile.phone", p.Phone},
		{"profile.address", p.Address},
		{"profile.summary", p.Summary},
	} {
		v.maxLen(f.name, f.value)
	}

	s := r.Sections

	v.maxItems("sections.experiences", len(s.Experiences))
	for i, e := range s.Experiences {
		prefix := fmt.Sprintf("sections.experiences[%d]", i)
		v.maxLen(prefix+".title", e.Title)
		v.maxLen(prefix+".company", e.Company)
		v.maxLen(prefix+".location", e.Location)
		v.maxLen(prefix+".period", e.Period)
		v.maxLen(prefix+".description", e.Description)
	}

	v.maxItems("sections.projects", len(s.Projects))
	for i, e := range s.Projects {
		prefix := fmt.Sprintf("sections.projects[%d]", i)
		v.maxLen(prefix+".title", e.Title)
		v.maxLen(prefix+".tech", strings.Join(e.Tech, ", "))
		v.maxLen(prefix+".description", e.Description)
	}

	v.maxItems("sections.skills", len(s.Skills))
	for i, e := range s.Skills {
		prefix := fmt.Sprintf("sections.skills[%d]", i)
		v.maxLen(prefix+".name", e.Name)
		v.maxLen(prefix+".tags", strings.Join(e.Tags, ", "))
	}

	v.maxItems("sections.education", len(s.Educations))
	for i, e := range s.Educations {
		prefix := fmt.Sprintf("sections.education[%d]", i)
		v.maxLen(prefix+".degree", e.Degree)
		v.maxLen(prefix+".institution", e.Institution)
		v.maxLen(prefix+".period", e.Period)
	}

	if len(v.problems) > 0 {
		return &ValidationError{Problems: v.problems}
	}
	return nil
}
