package config

import (
	"strings"
	"testing"
	"time"
)

func fromMap(m map[string]string) func(string) (string, bool) {
	return func(key string) (string, bool) {
		v, ok := m[key]
		return v, ok
	}
}

func TestLoadDefaults(t *testing.T) {
	cfg, err := Load(fromMap(nil))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	want := Config{
		Addr:          ":8080",
		TypstBinary:   "typst",
		RenderTimeout: 15 * time.Second,
		MaxConcurrent: 4,
		ShutdownDelay: 5 * time.Second,
	}
	if cfg != want {
		t.Errorf("Load(empty) = %+v, want %+v", cfg, want)
	}
}

func TestLoadOverrides(t *testing.T) {
	cfg, err := Load(fromMap(map[string]string{
		"ADDR":           "127.0.0.1:9000",
		"TYPST_BIN":      "/usr/local/bin/typst",
		"FONT_PATH":      "/usr/share/fonts",
		"RENDER_TIMEOUT": "30s",
		"MAX_CONCURRENT": "8",
		"SHUTDOWN_DELAY": "0s",
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.Addr != "127.0.0.1:9000" || cfg.TypstBinary != "/usr/local/bin/typst" || cfg.FontPath != "/usr/share/fonts" {
		t.Errorf("string settings not applied: %+v", cfg)
	}
	if cfg.RenderTimeout != 30*time.Second || cfg.MaxConcurrent != 8 || cfg.ShutdownDelay != 0 {
		t.Errorf("numeric settings not applied: %+v", cfg)
	}
}

func TestLoadEmptyValueKeepsDefault(t *testing.T) {
	cfg, err := Load(fromMap(map[string]string{"ADDR": "", "MAX_CONCURRENT": ""}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.Addr != ":8080" || cfg.MaxConcurrent != 4 {
		t.Errorf("an empty variable should behave as unset: %+v", cfg)
	}
}

func TestLoadReportsEveryInvalidValue(t *testing.T) {
	_, err := Load(fromMap(map[string]string{
		"RENDER_TIMEOUT": "soon",
		"MAX_CONCURRENT": "0",
		"SHUTDOWN_DELAY": "-1s",
	}))
	if err == nil {
		t.Fatal("expected an error, got nil")
	}
	for _, key := range []string{"RENDER_TIMEOUT", "MAX_CONCURRENT", "SHUTDOWN_DELAY"} {
		if !strings.Contains(err.Error(), key) {
			t.Errorf("error %q should mention %s", err, key)
		}
	}
}
