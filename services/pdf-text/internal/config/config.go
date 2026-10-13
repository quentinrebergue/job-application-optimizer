package config

import (
	"fmt"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Addr          string        // ADDR, listen address
	MaxBytes      int64         // MAX_BYTES, the largest PDF accepted
	MaxPages      int           // MAX_PAGES, only the first pages are read
	Timeout       time.Duration // TIMEOUT, the longest a file may take
	MaxQueue      int           // MAX_QUEUE, files that may wait for the reader; past it they are refused at once
	MinTextChars  int           // MIN_TEXT_CHARS, under it a PDF is a picture, not a text
	MaxChars      int           // MAX_CHARS, the text is cut here (the AI that reads it has a limit too)
	CacheDir      string        // CACHE_DIR, where the compiled module is kept between two starts (empty: nowhere)
	ShutdownDelay time.Duration // SHUTDOWN_DELAY, how long /readyz fails before the server stops
}

// Load reads the configuration through lookup (os.LookupEnv in production, a
// map in tests). Unset or empty variables keep their default; every invalid
// value is reported at once.
func Load(lookup func(string) (string, bool)) (Config, error) {
	cfg := Config{
		Addr:          ":8080",
		MaxBytes:      2 << 20,
		MaxPages:      5,
		Timeout:       5 * time.Second,
		MaxQueue:      4,
		MinTextChars:  30,
		MaxChars:      40000,
		ShutdownDelay: 5 * time.Second,
	}
	var problems []string

	get := func(key string) (string, bool) {
		v, ok := lookup(key)
		return v, ok && v != ""
	}
	integer := func(key string, dst *int, min int) {
		v, ok := get(key)
		if !ok {
			return
		}
		n, err := strconv.Atoi(v)
		if err != nil || n < min {
			problems = append(problems, fmt.Sprintf("%s=%q must be an integer >= %d", key, v, min))
			return
		}
		*dst = n
	}
	duration := func(key string, dst *time.Duration, min time.Duration) {
		v, ok := get(key)
		if !ok {
			return
		}
		d, err := time.ParseDuration(v)
		if err != nil || d < min {
			problems = append(problems, fmt.Sprintf("%s=%q must be a duration like \"5s\" of at least %v", key, v, min))
			return
		}
		*dst = d
	}

	if v, ok := get("ADDR"); ok {
		cfg.Addr = v
	}
	if v, ok := get("CACHE_DIR"); ok {
		cfg.CacheDir = v
	}
	if v, ok := get("MAX_BYTES"); ok {
		n, err := strconv.ParseInt(v, 10, 64)
		// 1 KB at least (a PDF is bigger), 20 MB at most: the service is sized for resumes.
		if err != nil || n < 1<<10 || n > 20<<20 {
			problems = append(problems, fmt.Sprintf("MAX_BYTES=%q must be a number of bytes from 1024 to 20971520", v))
		} else {
			cfg.MaxBytes = n
		}
	}
	integer("MAX_PAGES", &cfg.MaxPages, 1)
	integer("MAX_QUEUE", &cfg.MaxQueue, 0)
	integer("MIN_TEXT_CHARS", &cfg.MinTextChars, 1)
	integer("MAX_CHARS", &cfg.MaxChars, 1000)
	duration("TIMEOUT", &cfg.Timeout, 100*time.Millisecond)
	duration("SHUTDOWN_DELAY", &cfg.ShutdownDelay, 0)

	if len(problems) > 0 {
		return Config{}, fmt.Errorf("invalid configuration: %s", strings.Join(problems, "; "))
	}
	return cfg, nil
}
