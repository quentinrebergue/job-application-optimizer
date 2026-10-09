# eval

Evaluation of the AI ranking (#44 follow-up): did a change to the prompt, the model or the pipeline make the ranking better or worse? The question is answered with figures, not with one offer looked at by hand.

## Use

1. Start the gateway (`services/ai-gateway`, see its README) and put `AI_GATEWAY_URL` in `.env.local`.
2. Turn a real job of the local database into a case, then fill `expected` with the ids you would pick:
   ```
   npm run eval:export -- <job id>
   ```
3. Run every case three times and compare with the baseline:
   ```
   npm run eval:ranking -- --label llama-3.3-70b
   npm run eval:ranking -- --case arista --runs 5
   npm run eval:ranking -- --with-examples     # also run the fictional cases
   npm run eval:ranking -- --model mistral-small-2603 --baseline small --save-baseline   # one reference per way of ranking
   npm run eval:ranking -- --model mistral-small-2603 --baseline small                    # compare with it
   npm run eval:ranking -- --label new-prompt --save-baseline   # when you are happy with it
   ```

The fictional cases of `cases/` are skipped when `private/` has cases of its own.
See what is sent and what comes back:
```
npm run eval:ranking -- --dry-run --case helsing        # the request only: no call, no cost
npm run eval:ranking -- --show-prompt --case helsing    # the request, then the evaluation
npm run eval:ranking -- --show-answer --case helsing    # also the answer: every entry with its level and reason,
                                                         # what the app recommends and what you expected
npm run eval:ranking -- --raw --case helsing            # the answer exactly as it came (JSON)
npm run eval:ranking -- --raw --show-answer --case helsing   # both
```

A full evaluation (5 offers x 3 runs) costs about 0.05 EUR. The details of the first run of each case say what the AI missed, what it added and which ids it invented. A baseline is only saved from a run without failures.

## What is measured

| Figure | Meaning |
|---|---|
| recall | Of the ids you expected, how many the AI recommended |
| precision | Of the ids it recommended, how many you expected |
| not scored | Expected entries the AI did not rate at all (forgotten, not judged low) |
| bad ids | Labels the AI invented or put in the wrong list, counted before the code drops them |
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
