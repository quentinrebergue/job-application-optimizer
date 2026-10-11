# src/tests/

Cross-cutting test files that verify workspace-wide invariants: rules that must hold for the whole code, not for one function. They scan the source, so a new file, route or query that breaks a rule fails here before it ships. Each also checks that its scan finds something (a scan that finds nothing proves nothing).

## Files

| File | Description |
|------|-------------|
| `data-scope.test.ts` | The property that matters most (#220): a user never reads or changes another user's data. Every SQL query on `jobs`, `entities` and the resume profile has `user_id` in its WHERE (or writes it) and lives in `src/lib/data`. Every other table the app queries is listed with the reason it is not scoped by user; an unknown table fails. |
| `routes-need-session.test.ts` | Every route of `/api` answers 401 to a visitor with no session, with a database that fails on any use; the public ones (`healthz`, `livez`, `csp-report`) are listed with why. A new route that forgets the check fails here. |
| `limits-in-sync.test.ts` | The size of a prompt and of an answer is the same in the gateway's manifest, the gateway's Go default and the app's `aiLimits()`: the app prices a call at the most the gateway allows. |
| `file-length.test.ts` | A 400-line limit on every `.ts` and `.tsx` file in `src/`. One test that lists every file over the limit, which keeps files focused and forces logic to be split. |
| `design-tokens.test.ts` | No raw palette classes (`bg-slate-50`, `text-[#fff]`…) in `src/`: colours come from the tokens in `globals.css`. One test that lists the offending files, and tests of the rule itself. |
