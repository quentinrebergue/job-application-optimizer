package render

import (
	"context"
	"fmt"
	"os/exec"
	"strings"
	"time"
)

// Version runs "typst --version". The service calls it at startup so a missing
// or broken Typst makes it fail immediately, rather than on the first CV.
func (t *Typst) Version(ctx context.Context) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	out, err := exec.CommandContext(ctx, t.cfg.Binary, "--version").Output()
	if err != nil {
		return "", fmt.Errorf("run %s --version: %w", t.cfg.Binary, err)
	}
	return strings.TrimSpace(string(out)), nil
}
