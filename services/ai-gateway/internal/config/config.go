package config

import (
	"errors"
	"fmt"
	"strconv"
	"time"
)

type Config struct {
	Addr string

	// OVHcloud AI Endpoints speaks the OpenAI chat-completions protocol.
	BaseURL string
	Token   string
	Model   string

	RequestTimeout time.Duration // whole call, retries included
	AttemptTimeout time.Duration // one HTTP attempt
	MaxRetries     int

	MaxOutputTokens int
	MaxPromptBytes  int

	ShutdownDelay time.Duration
}

func Load(lookup func(string) (string, bool)) (Config, error) {
	str := func(key, def string) string {
		if v, ok := lookup(key); ok && v != "" {
			return v
		}
		return def
	}
	var errs []error
	dur := func(key, def string) time.Duration {
		d, err := time.ParseDuration(str(key, def))
		if err != nil {
			errs = append(errs, fmt.Errorf("%s: %w", key, err))
		}
		return d
	}
	num := func(key string, def int) int {
		n, err := strconv.Atoi(str(key, strconv.Itoa(def)))
		if err != nil || n < 0 {
			errs = append(errs, fmt.Errorf("%s: must be a non-negative integer", key))
		}
		return n
	}

	cfg := Config{
		Addr:            str("ADDR", ":8080"),
		BaseURL:         str("AI_BASE_URL", "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1"),
		Token:           str("AI_TOKEN", ""),
		Model:           str("AI_MODEL", "Meta-Llama-3_3-70B-Instruct"),
		RequestTimeout:  dur("REQUEST_TIMEOUT", "60s"),
		AttemptTimeout:  dur("ATTEMPT_TIMEOUT", "30s"),
		MaxRetries:      num("MAX_RETRIES", 2),
		MaxOutputTokens: num("MAX_OUTPUT_TOKENS", 2000),
		MaxPromptBytes:  num("MAX_PROMPT_BYTES", 60000),
		ShutdownDelay:   dur("SHUTDOWN_DELAY", "5s"),
	}
	if cfg.Token == "" {
		errs = append(errs, errors.New("AI_TOKEN is required"))
	}
	if cfg.MaxOutputTokens == 0 || cfg.MaxPromptBytes == 0 {
		errs = append(errs, errors.New("MAX_OUTPUT_TOKENS and MAX_PROMPT_BYTES must be above 0"))
	}
	return cfg, errors.Join(errs...)
}
