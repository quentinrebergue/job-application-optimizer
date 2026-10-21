# eval

Evaluation of the AI ranking (#44 follow-up): did a change to the prompt, the model or the pipeline make the ranking better or worse? The question is answered with figures, not with one offer looked at by hand.

## Use

1. Start the gateway (`services/ai-gateway`, see its README) and put `AI_GATEWAY_URL` in `.env.local`. Or let the evaluation do it: `--start-gateway` builds the gateway, starts it on a free port with the model of `--model`, and stops it after the run (it needs `AI_TOKEN`, and `AI_BASE_URL` for a provider other than the default one, in `.env.local`, and Go). `--parallel 4` sends four calls at once (default 1; the time column is then measured under load, and the run stops if most calls fail).
   (A case may also carry a `header`: a title and a profile with the details of a person, to check what is sent of them: `LEAK` in the table means a detail reached the request, and the proposals refused by the code are counted.)
2. Turn a real job of the local database into a case, then fill `expected` with the ids you would pick:
   ```
   npm run eval:export -- <job id>
   ```
3. Run every case and compare with the reference:
   ```
   npm run eval:ranking -- --model mistral-medium-2604 --baseline medium
   npm run eval:ranking -- --model mistral-medium-2604 --baseline medium --save-baseline   # keep this run as the reference
   ```

`npm run eval:ranking -- --help` lists every option: what to print (`--details`, `--money`,
`--structure`, `--show-answer`, `--raw`, `--show-prompt`, `--dry-run`, `--sizes`) and what to try
(`--answer-format`, `--library-format`, `--no-schema`, `--clean-offer`, `--pad`). Nothing here changes the app.

`distractors.json` holds fictional experiences, projects and skills from many fields (health, teaching,
law, trades, writing, some tech): `--pad n` buries each case's library in `n` of each kind, with the real
entries in the middle, to see whether a long prompt makes the model miss what it finds in a short one (#185).

The fictional cases of `cases/` are skipped when `private/` has cases of its own.
A full evaluation (15 offers x 1 run, the default; `--runs 3` to measure stability) costs a few cents.

## Is a difference real?

With a few offers, a gap of a few points is often chance: each offer has about ten expected
entries, so one entry more or less is 10 points on that offer, and the same prompt gives nearly the
same answer from one run to the next, so repeating a run does not add evidence. The comparison is
therefore made **case by case**: it says on how many offers the figure got better, worse or stayed
the same, the mean change with its 95 % interval, and whether it is probably real or could be
chance. More offers narrow the interval; more runs hardly do.

## What is measured

| Figure | Meaning |
|---|---|
| recall | Of the ids you expected, how many the AI recommended |
| precision | Of the ids it recommended, how many you expected |
| not scored | Expected entries the AI did not rate at all (forgotten, not judged low) |
| stability | Overlap between runs of the same case (1 = same answer every time) |
| time, tokens | Median and worst time; tokens in and out |
| failures | Runs that ended in an error |
| cost | Euros per ranking (needs `--model`; an upper bound, cached tokens are not known). Prices are in `scripts/eval-ranking/prices.ts` |

A change counts as better or worse only beyond the noise: 0.01 on the ratios, 10 % on time and tokens.

## Files

| Path | Versioned | Content |
|---|---|---|
| `cases/` | yes | Fictional cases: they exercise the script and show the format |
| `private/` | **no** | My real offers and library: personal data |
| `results/` | **no** | One file per run, and `baseline.json` |

The code is in `scripts/eval-ranking/` (`metrics.ts` is tested without any AI call).

## The import of a resume (#267)

A functional test of `api/import/resume`: real PDFs through the real chain (the pdf-text service, the AI gateway, the checks of the app), several times, with what each run gave against what is expected. Nothing is saved (the save is tested on Postgres in `src/lib/import/save.db.test.ts`): this answers "does it read my resumes right?", and "the same every time?".

```
docker run --rm -p 8095:8080 -e MAX_PAGES=1 pdf-text:dev   # the first page only, as in production
# .env.local: PDF_TEXT_URL=http://localhost:8095 and AI_GATEWAY_URL (a gateway with the "import" feature)
npm run eval:import                                  # every case, 3 runs each
npm run eval:import -- --case two-columns --runs 5 --show
npm run eval:import -- --dry-run                     # the text as the model reads it, and the request: no AI
```

A case is a file in `import/` (fictional resumes of the repository, versioned) or in `private/import/` (yours, **not versioned**: personal data; when there are some, only those run):

```json
{ "pdf": "/path/to/resume.pdf", "expected": { "experiences": 1, "education": 2, "projects": { "max": 3 }, "skills": { "min": 3 } } }
```

A number is an exact count, `{ "min", "max" }` a range; a kind left out is not checked. The exit code is 1 when a run did not give what was expected, or failed.

A case can also give its `truth`: what a person would have typed (the profile, and each experience, project and degree with its fields). The import is then compared field by field (`scripts/eval-import/score.ts`): entries are paired with the expected ones by their words, and the run says what was found, missing or not expected, and which fields are wrong. The totals at the end (recall, precision, fields right, profile right) are the figures to compare two versions of the prompt with. The run also checks that the request to the AI holds none of the name, email or phone of the truth, and says `LEAK` if it does.
