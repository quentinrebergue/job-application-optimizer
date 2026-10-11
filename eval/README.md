# eval

Evaluation of the AI ranking (#44 follow-up): did a change to the prompt, the model or the pipeline make the ranking better or worse? The question is answered with figures, not with one offer looked at by hand.

## Use

1. Start the gateway (`services/ai-gateway`, see its README) and put `AI_GATEWAY_URL` in `.env.local`.
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
A full evaluation (15 offers x 3 runs) costs a few cents.

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
