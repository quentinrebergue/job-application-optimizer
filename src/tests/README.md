# src/tests/

Cross-cutting test files that verify workspace-wide invariants.

## Files

| File | Description |
|------|-------------|
| `file-length.test.ts` | Enforces a 400-line limit on every `.ts` and `.tsx` file in `src/`. Each file gets its own test case so failures are easy to identify. This keeps files focused and forces logic to be split into multiple units. |
| `design-tokens.test.ts` | No raw palette classes (`bg-slate-50`, `text-[#fff]`…) in `src/`: colours come from the tokens in `globals.css`. |
