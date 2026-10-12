// Package hasher computes and checks bcrypt hashes, a few at a time.
package hasher

import (
	"context"
	"errors"
	"sync/atomic"

	"golang.org/x/crypto/bcrypt"
)

// bcrypt only reads the first 72 bytes of a password. The JavaScript libraries the app used before
// (bcryptjs, bcrypt) cut a longer one silently, so the hashes already stored were made from its first 72
// bytes; Go's library refuses it. Cutting it here gives the same verdict as before for every account.
const maxPasswordBytes = 72

// ErrBusy means every slot is taken and the queue of waiting requests is full: the caller is told to try again.
var ErrBusy = errors.New("hasher: all slots are busy and the queue is full")

// ErrInvalidHash means the stored hash is not a bcrypt hash: a bug or a damaged row, never a wrong password.
var ErrInvalidHash = errors.New("hasher: not a bcrypt hash")

type Hasher struct {
	cost    int
	running chan struct{} // one token per hash being computed: its capacity is the cap on hashes at once
	waiting atomic.Int32  // requests waiting for a token
	maxWait int32
}

// New makes a Hasher that computes at most maxConcurrent hashes at once and lets at most maxQueue more wait.
func New(cost, maxConcurrent, maxQueue int) *Hasher {
	return &Hasher{cost: cost, running: make(chan struct{}, maxConcurrent), maxWait: int32(maxQueue)}
}

// acquire takes a slot: at once if one is free, else after waiting in the queue, else ErrBusy. bcrypt itself
// cannot be stopped half way, so the context only ends the wait.
func (h *Hasher) acquire(ctx context.Context) error {
	select {
	case h.running <- struct{}{}:
		return nil
	default:
	}
	if h.waiting.Add(1) > h.maxWait {
		h.waiting.Add(-1)
		return ErrBusy
	}
	defer h.waiting.Add(-1)
	select {
	case h.running <- struct{}{}:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

func (h *Hasher) release() { <-h.running }

func isMalformed(err error) bool {
	var version bcrypt.HashVersionTooNewError
	var invalid bcrypt.InvalidHashPrefixError
	var cost bcrypt.InvalidCostError
	return errors.As(err, &version) || errors.As(err, &invalid) || errors.As(err, &cost)
}

func cut(password []byte) []byte {
	if len(password) > maxPasswordBytes {
		return password[:maxPasswordBytes]
	}
	return password
}

// Hash returns the bcrypt hash of the password, in the "$2a$" / "$2b$" format the stored hashes already have.
func (h *Hasher) Hash(ctx context.Context, password []byte) (string, error) {
	if err := h.acquire(ctx); err != nil {
		return "", err
	}
	defer h.release()
	hash, err := bcrypt.GenerateFromPassword(cut(password), h.cost)
	return string(hash), err
}

// Verify says whether the password matches the hash. A wrong password is (false, nil); a hash that is not a
// bcrypt hash, or a busy hasher, is an error: the caller must not read it as "wrong password".
func (h *Hasher) Verify(ctx context.Context, password []byte, hash string) (bool, error) {
	if err := h.acquire(ctx); err != nil {
		return false, err
	}
	defer h.release()
	err := bcrypt.CompareHashAndPassword([]byte(hash), cut(password))
	switch {
	case err == nil:
		return true, nil
	case errors.Is(err, bcrypt.ErrMismatchedHashAndPassword):
		return false, nil
	case errors.Is(err, bcrypt.ErrHashTooShort), isMalformed(err):
		return false, ErrInvalidHash
	}
	return false, err
}
