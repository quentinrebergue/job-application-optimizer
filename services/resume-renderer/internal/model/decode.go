package model

import (
	"encoding/json"
	"io"
)

// Decode reads and validates a render request. Every failure is returned as a
// *ValidationError so the HTTP layer can map it to a 400 in one place.
func Decode(r io.Reader) (*Request, error) {
	var req Request
	dec := json.NewDecoder(r)
	dec.DisallowUnknownFields()

	if err := dec.Decode(&req); err != nil {
		return nil, &ValidationError{Problems: []string{"malformed JSON: " + err.Error()}}
	}
	if _, err := dec.Token(); err != io.EOF {
		return nil, &ValidationError{Problems: []string{"unexpected data after the JSON body"}}
	}
	if err := req.Validate(); err != nil {
		return nil, err
	}
	return &req, nil
}
