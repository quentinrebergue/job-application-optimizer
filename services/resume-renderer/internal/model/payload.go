package model

type Request struct {
	SchemaVersion int            `json:"schema_version"`
	Template      TemplateRef    `json:"template"`
	Options       map[string]any `json:"options"`
	Profile       Profile        `json:"profile"`
	Sections      Section        `json:"sections"`
}

type TemplateRef struct {
	ID string `json:"id"`
}

type Profile struct {
	Name     string `json:"name"`
	Title    string `json:"title"`
	Email    string `json:"email"`
	LinkedIn string `json:"linkedin"`
	Phone    string `json:"phone"`
	Address  string `json:"address"`
	Summary  string `json:"summary"`
}

type Experience struct {
	Title       string `json:"title"`
	Company     string `json:"company"`
	Location    string `json:"location"`
	Period      string `json:"period"`
	Description string `json:"description"`
}

type Project struct {
	Title       string   `json:"title"`
	Tech        []string `json:"tech"`
	Description string   `json:"description"`
}

type Skill struct {
	Name string   `json:"name"`
	Tags []string `json:"tags"`
}

type Education struct {
	Degree      string `json:"degree"`
	Institution string `json:"institution"`
	Period      string `json:"period"`
}

type Section struct {
	Experiences []Experience `json:"experiences"`
	Projects    []Project    `json:"projects"`
	Skills      []Skill      `json:"skills"`
	Educations  []Education  `json:"education"`
}
