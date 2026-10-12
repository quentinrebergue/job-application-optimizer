package hasher

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"
)

// Cost 4 is bcrypt's minimum: the tests check the logic, not the work factor.
const testCost = 4

// Hashes made by bcryptjs (cost 4), the library the app used before: every account already stored looks like these.
var fromBcryptjs = []struct{ name, password, hash string }{
	{"plain", "correct horse battery", "$2b$04$Z8LhCSB6DwdNHM8./48/keLOnp23tOw5FzRiUHY2hV6T3l4XJJVvu"},
	{"unicode", "Pa55word-é-日本-🙂", "$2b$04$r6l9CL0MxhfcOWjWkkkKA.w40YCPerQzWrXkgQYLX./MIxqf0cqsq"},
	{"b71", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "$2b$04$UdJ8JcUAwxRNRWcfDdtod.NPEK3o5lY9y5scHT6Z39bTjhu06Sx32"},
	{"b72", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "$2b$04$yxa04eFfM0u27SMWV0mu1eL5a04xHNCVTXolSgeNBC41rsAp/xdCa"},
	{"b80", "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", "$2b$04$9in.sPi8yjugXvkuQOfUIuZxYCvdSJ4PS1eqkSb26JJsf6kWp6c.O"},
	{"empty", "", "$2b$04$wkyj.b5kIMMYeime6DTQVuGyk3odM8VHi737RhCExywvHM5vPhjIW"},
}

func TestVerifiesTheHashesTheAppAlreadyStored(t *testing.T) {
	h := New(testCost, 1, 0)
	for _, v := range fromBcryptjs {
		ok, err := h.Verify(context.Background(), []byte(v.password), v.hash)
		if err != nil || !ok {
			t.Errorf("%s: Verify = %v, %v; want true, nil", v.name, ok, err)
		}
	}
}

func TestACutPasswordMatchesLikeBefore(t *testing.T) {
	// bcryptjs hashed the first 72 bytes only: a longer password with the same start was accepted, and still is.
	h := New(testCost, 1, 0)
	var long, hash string
	for _, v := range fromBcryptjs {
		if v.name == "b80" {
			long, hash = v.password, v.hash
		}
	}
	ok, err := h.Verify(context.Background(), []byte(long+"anything after the 72nd byte"), hash)
	if err != nil || !ok {
		t.Errorf("a password with the same 72 first bytes: Verify = %v, %v; want true, nil", ok, err)
	}
	ok, _ = h.Verify(context.Background(), []byte(strings.Repeat("y", 80)), hash)
	if ok {
		t.Error("a password that differs in its first 72 bytes was accepted")
	}
}

func TestHashThenVerify(t *testing.T) {
	h := New(testCost, 1, 0)
	hash, err := h.Hash(context.Background(), []byte("Pa55word-é-日本"))
	if err != nil {
		t.Fatalf("Hash: %v", err)
	}
	if !strings.HasPrefix(hash, "$2a$04$") && !strings.HasPrefix(hash, "$2b$04$") {
		t.Errorf("hash %q is not a bcrypt hash of cost 4", hash)
	}
	if ok, err := h.Verify(context.Background(), []byte("Pa55word-é-日本"), hash); err != nil || !ok {
		t.Errorf("right password: %v, %v", ok, err)
	}
	if ok, err := h.Verify(context.Background(), []byte("another"), hash); err != nil || ok {
		t.Errorf("wrong password: %v, %v; want false, nil", ok, err)
	}
}

func TestALongPasswordIsHashedNotRefused(t *testing.T) {
	h := New(testCost, 1, 0)
	if _, err := h.Hash(context.Background(), []byte(strings.Repeat("a", 200))); err != nil {
		t.Errorf("a 200-byte password: %v", err)
	}
}

func TestAHashThatIsNotBcryptIsAnErrorNotAWrongPassword(t *testing.T) {
	h := New(testCost, 1, 0)
	ok, err := h.Verify(context.Background(), []byte("x"), "not a hash")
	if !errors.Is(err, ErrInvalidHash) || ok {
		t.Errorf("Verify = %v, %v; want false and ErrInvalidHash", ok, err)
	}
}

func TestRefusesAtOnceWhenSlotsAndQueueAreFull(t *testing.T) {
	h := New(testCost, 1, 0)
	h.running <- struct{}{} // the only slot is taken, and there is no queue
	_, err := h.Hash(context.Background(), []byte("x"))
	if !errors.Is(err, ErrBusy) {
		t.Errorf("err = %v, want ErrBusy", err)
	}
}

func TestAWaitingRequestGetsTheSlotWhenItIsFreed(t *testing.T) {
	h := New(testCost, 1, 1)
	h.running <- struct{}{}
	done := make(chan error, 1)
	go func() { _, err := h.Hash(context.Background(), []byte("x")); done <- err }()
	time.Sleep(50 * time.Millisecond) // let it queue
	if h.waiting.Load() != 1 {
		t.Fatalf("waiting = %d, want 1", h.waiting.Load())
	}
	h.release()
	if err := <-done; err != nil {
		t.Errorf("the waiting request failed: %v", err)
	}
	if h.waiting.Load() != 0 {
		t.Errorf("waiting = %d after the wait, want 0", h.waiting.Load())
	}
}

func TestTheQueueIsBounded(t *testing.T) {
	h := New(testCost, 1, 1)
	h.running <- struct{}{}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go h.Hash(ctx, []byte("first waiter")) //nolint:errcheck
	time.Sleep(50 * time.Millisecond)
	_, err := h.Hash(context.Background(), []byte("second waiter"))
	if !errors.Is(err, ErrBusy) {
		t.Errorf("err = %v, want ErrBusy for the request past the queue", err)
	}
}

func TestACancelledWaitLeavesTheQueue(t *testing.T) {
	h := New(testCost, 1, 1)
	h.running <- struct{}{}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Millisecond)
	defer cancel()
	_, err := h.Hash(ctx, []byte("x"))
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Errorf("err = %v, want the deadline", err)
	}
	if h.waiting.Load() != 0 {
		t.Errorf("waiting = %d after the wait ended, want 0", h.waiting.Load())
	}
}
