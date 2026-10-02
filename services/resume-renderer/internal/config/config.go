package config

import (
	"fmt"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Addr          string        // ADDR, listen address
	TypstBinary   string        // TYPST_BIN, typst executable
	FontPath      string        // FONT_PATH, when set only these fonts are used
	RenderTimeout time.Duration // RENDER_TIMEOUT, e.g. "15s"
	MaxConcurrent int           // MAX_CONCURRENT, renders running at once
	ShutdownDelay time.Duration // SHUTDOWN_DELAY, how long /readyz fails before the server stops
}

// Load reads the configuration through lookup (os.LookupEnv in production, a
// map in tests). Unset or empty variables keep their default; every invalid
// value is reported at once.
func Load(lookup func(string) (string, bool)) (Config, error) {
	cfg := Config{
		Addr:          ":8080",
		TypstBinary:   "typst",
		RenderTimeout: 15 * time.Second,
		MaxConcurrent: 4,
		ShutdownDelay: 5 * time.Second,
	}
	var problems []string

	get := func(key string) (string, bool) {
		v, ok := lookup(key)
		return v, ok && v != ""
	}
	duration := func(key string, dst *time.Duration, min time.Duration) {
		v, ok := get(key)
		if !ok {
			return
		}
		d, err := time.ParseDuration(v)
		if err != nil || d < min {
			problems = append(problems, fmt.Sprintf("%s=%q must be a duration like \"15s\" of at least %v", key, v, min))
			return
		}
		*dst = d
	}

	if v, ok := get("ADDR"); ok {
		cfg.Addr = v
	}
	if v, ok := get("TYPST_BIN"); ok {
		cfg.TypstBinary = v
	}
	if v, ok := get("FONT_PATH"); ok {
		cfg.FontPath = v
	}
	duration("RENDER_TIMEOUT", &cfg.RenderTimeout, time.Second)
	duration("SHUTDOWN_DELAY", &cfg.ShutdownDelay, 0)
	if v, ok := get("MAX_CONCURRENT"); ok {
		n, err := strconv.Atoi(v)
		if err != nil || n < 1 {
			problems = append(problems, fmt.Sprintf("MAX_CONCURRENT=%q must be an integer >= 1", v))
		} else {
			cfg.MaxConcurrent = n
		}
	}

	if len(problems) > 0 {
		return Config{}, fmt.Errorf("invalid configuration: %s", strings.Join(problems, "; "))
	}
	return cfg, nil
}
