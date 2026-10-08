package config

import "testing"

func lookupFrom(m map[string]string) func(string) (string, bool) {
	return func(k string) (string, bool) { v, ok := m[k]; return v, ok }
}

func TestLoadDefaults(t *testing.T) {
	cfg, err := Load(lookupFrom(map[string]string{"AI_TOKEN": "t"}))
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Addr != ":8080" || cfg.MaxRetries != 2 || cfg.MaxOutputTokens != 2000 || cfg.RequestTimeout.Seconds() != 60 {
		t.Fatalf("unexpected defaults: %+v", cfg)
	}
}

func TestLoadRequiresToken(t *testing.T) {
	if _, err := Load(lookupFrom(nil)); err == nil {
		t.Fatal("expected an error without AI_TOKEN")
	}
}

func TestLoadReportsEveryProblem(t *testing.T) {
	_, err := Load(lookupFrom(map[string]string{
		"AI_TOKEN": "t", "REQUEST_TIMEOUT": "soon", "MAX_RETRIES": "-1",
	}))
	if err == nil {
		t.Fatal("expected errors")
	}
	for _, want := range []string{"REQUEST_TIMEOUT", "MAX_RETRIES"} {
		if !contains(err.Error(), want) {
			t.Errorf("error does not mention %s: %v", want, err)
		}
	}
}

func contains(s, sub string) bool {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
