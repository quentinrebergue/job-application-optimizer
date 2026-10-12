package config

import (
	"fmt"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Addr          string        // ADDR, listen address
	Cost          int           // BCRYPT_COST, the work factor of new hashes (12 in production)
	MaxConcurrent int           // MAX_CONCURRENT, hashes computed at once
	MaxQueue      int           // MAX_QUEUE, requests that may wait for a free slot; past it they are refused at once
	ShutdownDelay time.Duration // SHUTDOWN_DELAY, how long /readyz fails before the server stops
}

// Load reads the configuration through lookup (os.LookupEnv in production, a
// map in tests). Unset or empty variables keep their default; every invalid
// value is reported at once.
func Load(lookup func(string) (string, bool)) (Config, error) {
	cfg := Config{
		Addr:          ":8080",
		Cost:          12,
		MaxConcurrent: 1,
		MaxQueue:      8,
		ShutdownDelay: 5 * time.Second,
	}
	var problems []string

	get := func(key string) (string, bool) {
		v, ok := lookup(key)
		return v, ok && v != ""
	}

	if v, ok := get("ADDR"); ok {
		cfg.Addr = v
	}
	if v, ok := get("BCRYPT_COST"); ok {
		n, err := strconv.Atoi(v)
		// 4 is bcrypt's minimum (used by tests); above 15 a single hash takes seconds.
		if err != nil || n < 4 || n > 15 {
			problems = append(problems, fmt.Sprintf("BCRYPT_COST=%q must be an integer from 4 to 15", v))
		} else {
			cfg.Cost = n
		}
	}
	if v, ok := get("MAX_CONCURRENT"); ok {
		n, err := strconv.Atoi(v)
		if err != nil || n < 1 {
			problems = append(problems, fmt.Sprintf("MAX_CONCURRENT=%q must be an integer >= 1", v))
		} else {
			cfg.MaxConcurrent = n
		}
	}
	if v, ok := get("MAX_QUEUE"); ok {
		n, err := strconv.Atoi(v)
		if err != nil || n < 0 {
			problems = append(problems, fmt.Sprintf("MAX_QUEUE=%q must be an integer >= 0", v))
		} else {
			cfg.MaxQueue = n
		}
	}
	if v, ok := get("SHUTDOWN_DELAY"); ok {
		d, err := time.ParseDuration(v)
		if err != nil || d < 0 {
			problems = append(problems, fmt.Sprintf("SHUTDOWN_DELAY=%q must be a duration like \"5s\"", v))
		} else {
			cfg.ShutdownDelay = d
		}
	}

	if len(problems) > 0 {
		return Config{}, fmt.Errorf("invalid configuration: %s", strings.Join(problems, "; "))
	}
	return cfg, nil
}
