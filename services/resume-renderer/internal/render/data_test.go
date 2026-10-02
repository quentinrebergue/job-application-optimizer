package render

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/quentinrebergue/job-application-optimizer/services/resume-renderer/internal/model"
)

func decode(t *testing.T, body string) *model.Request {
	t.Helper()
	req, err := model.Decode(strings.NewReader(body))
	if err != nil {
		t.Fatalf("request should decode: %v", err)
	}
	return req
}

const minimalBody = `{
  "schema_version": 1,
  "template": {"id": "classic"},
  "profile": {"name": "Ada Lovelace"},
  "sections": {
    "projects": [{"title": "App"}],
    "skills": [{"name": "Go"}]
  }
}`

func TestBuildDataNeverEmitsNull(t *testing.T) {
	req := decode(t, minimalBody)
	data, err := BuildData(req, map[string]any{"fontSize": 10.5})
	if err != nil {
		t.Fatalf("BuildData: %v", err)
	}
	if strings.Contains(string(data), "null") {
		t.Errorf("data.json must not contain null, got %s", data)
	}

	var doc struct {
		Options  map[string]any `json:"options"`
		Sections struct {
			Experiences []any `json:"experiences"`
			Projects    []struct {
				Tech []string `json:"tech"`
			} `json:"projects"`
		} `json:"sections"`
	}
	if err := json.Unmarshal(data, &doc); err != nil {
		t.Fatalf("data.json is not valid JSON: %v", err)
	}
	if doc.Options["fontSize"] != 10.5 {
		t.Errorf("options not carried over: %v", doc.Options)
	}
	if doc.Sections.Experiences == nil || len(doc.Sections.Projects[0].Tech) != 0 {
		t.Errorf("empty lists should be [] not null: %+v", doc.Sections)
	}
}

func TestBuildDataDoesNotMutateRequest(t *testing.T) {
	req := decode(t, minimalBody)
	if _, err := BuildData(req, nil); err != nil {
		t.Fatalf("BuildData: %v", err)
	}
	if req.Sections.Projects[0].Tech != nil {
		t.Errorf("the caller's request was modified: %+v", req.Sections.Projects[0])
	}
}
