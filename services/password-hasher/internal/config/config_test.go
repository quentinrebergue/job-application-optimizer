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
	want := Config{Addr: ":8080", Cost: 12, MaxConcurrent: 1, MaxQueue: 8, ShutdownDelay: 5 * time.Second}
	if cfg != want {
		t.Errorf("Load(empty) = %+v, want %+v", cfg, want)
	}
}

func TestLoadOverrides(t *testing.T) {
	cfg, err := Load(fromMap(map[string]string{
		"ADDR": "127.0.0.1:9000", "BCRYPT_COST": "4", "MAX_CONCURRENT": "2", "MAX_QUEUE": "0", "SHUTDOWN_DELAY": "0s",
	}))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	want := Config{Addr: "127.0.0.1:9000", Cost: 4, MaxConcurrent: 2, MaxQueue: 0, ShutdownDelay: 0}
	if cfg != want {
		t.Errorf("Load(overrides) = %+v, want %+v", cfg, want)
	}
}

func TestLoadReportsEveryProblemAtOnce(t *testing.T) {
	_, err := Load(fromMap(map[string]string{"BCRYPT_COST": "3", "MAX_CONCURRENT": "0", "MAX_QUEUE": "-1", "SHUTDOWN_DELAY": "soon"}))
	if err == nil {
		t.Fatal("expected an error")
	}
	for _, key := range []string{"BCRYPT_COST", "MAX_CONCURRENT", "MAX_QUEUE", "SHUTDOWN_DELAY"} {
		if !strings.Contains(err.Error(), key) {
			t.Errorf("error %q does not mention %s", err, key)
		}
	}
}

func TestEmptyValueKeepsDefault(t *testing.T) {
	cfg, err := Load(fromMap(map[string]string{"MAX_CONCURRENT": ""}))
	if err != nil || cfg.MaxConcurrent != 1 {
		t.Errorf("empty MAX_CONCURRENT: cfg=%+v err=%v, want the default 1", cfg, err)
	}
}
