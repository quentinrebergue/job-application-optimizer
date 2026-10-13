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
	want := Config{Addr: ":8080", MaxBytes: 2 << 20, MaxPages: 5, Timeout: 5 * time.Second, MaxQueue: 4, MinTextChars: 30, MaxChars: 40000, ShutdownDelay: 5 * time.Second}
	if cfg != want {
		t.Errorf("Load(empty) = %+v, want %+v", cfg, want)
	}
}

func TestLoadOverrides(t *testing.T) {
	cfg, err := Load(fromMap(map[string]string{
		"ADDR": "127.0.0.1:9000", "MAX_BYTES": "4096", "MAX_PAGES": "2", "TIMEOUT": "500ms", "MAX_QUEUE": "0",
		"MIN_TEXT_CHARS": "10", "MAX_CHARS": "5000", "CACHE_DIR": "/cache", "SHUTDOWN_DELAY": "0s",
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	want := Config{Addr: "127.0.0.1:9000", MaxBytes: 4096, MaxPages: 2, Timeout: 500 * time.Millisecond, MaxQueue: 0, MinTextChars: 10, MaxChars: 5000, CacheDir: "/cache"}
	if cfg != want {
		t.Errorf("Load(overrides) = %+v, want %+v", cfg, want)
	}
}

func TestLoadReportsEveryProblemAtOnce(t *testing.T) {
	_, err := Load(fromMap(map[string]string{"MAX_BYTES": "12", "MAX_PAGES": "0", "TIMEOUT": "soon", "MAX_QUEUE": "-1", "MIN_TEXT_CHARS": "0", "MAX_CHARS": "10"}))
	if err == nil {
		t.Fatal("expected an error")
	}
	for _, key := range []string{"MAX_BYTES", "MAX_PAGES", "TIMEOUT", "MAX_QUEUE", "MIN_TEXT_CHARS", "MAX_CHARS"} {
		if !strings.Contains(err.Error(), key) {
			t.Errorf("error %q does not mention %s", err, key)
		}
	}
}

func TestTheSizeIsBounded(t *testing.T) {
	if _, err := Load(fromMap(map[string]string{"MAX_BYTES": "999999999"})); err == nil {
		t.Error("a limit of a gigabyte must be refused: the service is sized for resumes")
	}
}
