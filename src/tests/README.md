# src/tests/

Cross-cutting test files that verify workspace-wide invariants.

## Files

| File | Description |
|------|-------------|
| `file-length.test.ts` | Enforces a 400-line limit on every `.ts` file in `src/` and `mcp/`. Each file gets its own test case so failures are easy to identify. This keeps files focused and forces logic to be split into multiple units. |
