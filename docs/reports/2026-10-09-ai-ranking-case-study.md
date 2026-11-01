# Making an AI resume ranker cheap, fast and measurable

**Date:** 2026-10-09
**Work:** tickets #44 (AI gateway), #184 (ranking quality), #188 (protection against abuse and runaway cost), #192 (change of provider), #185, #201 to #203 (limits and quotas), #216 (does a big library need a shortlist?); PRs #180 to #195 and the ones that followed.
**Updated:** 2026-10-11 (the provider switch is live; new section on the stress test with big libraries).

## Summary

FastResume's AI ranking now costs about **0.60 EUR per 1,000 rankings** and answers in about **3 seconds**. The first working versions cost 3 to 10 EUR per 1,000 and took 20 to 99 seconds, with weaker and less reliable results.

The feature reads a job offer and a person's library of experiences, projects and skills, and recommends which entries to put on the resume. This document tells how it got from a first prototype to this point: an AI gateway written in Go, a custom evaluation tool, about twenty ideas tested against real job offers, and the discipline of not trusting a result before checking it was not chance.

| | First setup (OVH, Llama 3.3 70B) | First Mistral Medium setup | Now (Mistral Small) |
| --- | --- | --- | --- |
| Cost per 1,000 rankings | about 3.1 EUR | about 9.5 EUR | **0.60 EUR** |
| Time per ranking, median / worst | 58 s / 99 s, 21 s / 93 s after the prompt rework | 6.0 s / 7.5 s | **3.0 s / 6.8 s** |
| Entries the author expected that were picked (recall) | 51 % on 5 offers, 73 % after rework | 88 % on 5 offers | 68 % on 45 offers |
| Share of picks the author expected (precision) | 62 %, 63 % after rework | 76 % | 78 % |
| Invented ids / forgotten entries per ranking | 0.33 / 5.4 | 0 / 0 | **0 / 0** |

The columns use different test sets: compare within a column, not across. The 5-offer set was too small to trust, which is the story of the section on chance below. On the 45-offer set, Mistral Small and the ten times more expensive Mistral Medium are statistically indistinguishable.

What mattered most:

1. **A gateway** that owns the provider, the key, the timeouts and the output checks, so the app never talks to a model directly and a provider change is a configuration change.
2. **Treating the model's answer as untrusted input**: short labels instead of ids, every label validated in code. Invented ids went from 0.33 to 0 per ranking.
3. **Asking the model to rate, and letting the code choose**: rating every entry removed forgotten entries (5.4 to 0) and raised recall from 51 % to 73 % on the first set.
4. **Cutting tokens where they cost money**: output tokens dropped from 1,049 to about 450, mostly by deleting what nothing read and asking for minified JSON.
5. **Measuring honestly**: widening the test set from 5 to 45 real offers showed that a promising YAML format gave nothing, and that the small model matches the large one.
6. **Bounding what a user can send and spend**: sizes of every input, caps on what a library holds, a rate on creations, per-user AI quotas, a monthly cap in euros, a kill switch, and a stress test that checked the limits do not hurt the quality.

## Context and constraints

FastResume lets a student or graduate keep a library of experiences, projects, skills and education once, then build a tailored resume for each job offer. The AI ranking is the step that reads the offer and the library and recommends which entries to show. The person stays in control: recommendations pre-select checkboxes, nothing is forced.

Four constraints shaped every decision:

- **Cost.** The product is free and aimed first at a school. One thousand rankings is ten resumes for a hundred students, which can happen quickly. At about 10 EUR per 1,000 rankings the first version was too expensive for that.
- **Speed.** A person waits on the button. The first measurements showed 20 to 99 seconds, which is too long and sometimes beyond a 60-second proxy limit.
- **Reliability.** A model that invents an id, forgets an entry or breaks its output format cannot be allowed to reach the interface.
- **Privacy and hosting.** The product promises European hosting and minimal data sharing, so the choice of provider and what goes into a prompt (no name, no contact details) are product decisions, not only technical ones.

The infrastructure is deliberately small: one Kubernetes node (2 vCPU, 4 GB of memory) on OVHcloud, deployed with Argo CD and GitHub Actions, for about 30 EUR a month in total. Any new service had to fit in tens of megabytes.

## Architecture: an AI gateway in Go

Every AI call goes through one small Go service, the gateway, built with the standard library only. It exists because a browser must never hold an API key, and because limits, retries and accounting belong in one place rather than in every feature.

```mermaid
flowchart LR
    A["Offer and library<br/>one job offer, the person's<br/>experiences, projects, skills"] --> B["Short labels<br/>E1, P3, S2 in place of<br/>real ids, offer cleaned"]
    B --> C["AI gateway in Go<br/>timeouts, retries, size caps,<br/>JSON check, optional schema"]
    C --> D["The model<br/>rates every label from 0 to 3<br/>and lists its best entries"]
    D --> E["Validate in code<br/>drop unknown labels, wrong<br/>types and invalid levels"]
    E --> F["Code chooses<br/>2 to 4 experiences, 3 to 5<br/>projects, 2 to 4 skills"]
    style E fill:#e6f0fb,stroke:#2f6fd0,stroke-width:2px
```

The model never decides alone: its answer goes through a validation step in code, and only then do rules choose what reaches the resume. The gateway hides the provider: OVHcloud first, Mistral now.

What the gateway does:

- **Speaks one protocol.** It calls any OpenAI-compatible chat endpoint, so moving from OVHcloud AI Endpoints to Mistral changed three environment variables (address, key, model name), not code.
- **Bounds every call.** A timeout per attempt and one for the whole request, retries with growing delays on network errors, 429 and 5xx (not on a 400), a cap on prompt size and on output tokens.
- **Checks the answer.** It refuses a reply that is not valid JSON, and can pass a JSON Schema to the provider so the model cannot write a value the schema forbids. A free-text mode exists for experiments.
- **Is cheap to run and safe to expose.** About 24 MB of memory requested, non-root, read-only filesystem, health and readiness probes, graceful shutdown, a network policy that lets only the application call it and lets it call out only on HTTPS.

What the application does around it:

1. **Labels, not ids.** Each library entry gets a short label (E1 for an experience, P3 for a project, S2 for a skill). The model never sees or writes a real id.
2. **Rate every entry.** The model gives each label a level from 0 to 3 and lists its best entries.
3. **Validate in code.** Unknown labels, labels of the wrong type and invalid levels are dropped and counted. The answer is treated as untrusted input.
4. **The code chooses.** Which entries reach the resume (2 to 4 experiences, 3 to 5 projects, 2 to 4 skill sections) is decided by rules in code, not by the model.

The gateway and the answer format were written step by step, each step merged on its own with tests: a skeleton with retries and strict JSON, then deployment (manifests, network policy, CI and CD), then the ranking switched onto it with the code of the two earlier providers removed, then the optional schema and text format.

## How we measure: a custom evaluation tool

Optimising without measuring is guessing, so the first thing built after the gateway was a small evaluation tool (`npm run eval:ranking`, see [`eval/README.md`](../../eval/README.md)). It runs real job offers through the real pipeline, gateway included, and compares the result to what the author would have chosen.

Each **case** is a real job offer plus the author's library plus an `expected` selection: the entries the author would put on that resume. Cases are kept out of the repository because they contain personal data.

| Figure | What it tells |
| --- | --- |
| Recall | Of the entries expected, how many the AI recommended |
| Precision | Of the entries recommended, how many were expected |
| Forgotten entries | Entries the AI never rated at all, as opposed to judged low |
| Invented ids | Labels the model made up or put in the wrong list, counted before the code drops them |
| Stability | How much the selection changes between runs of the same offer |
| Time and tokens | Median and worst time, tokens in and out, as reported by the provider, not estimated |
| Cost | Euros per ranking, split between the prompt and the answer, then by part of each, to show where to optimise |

The tool grew with the questions we asked it:

- **Named references.** One saved reference per way of ranking, refused if the run had failures (the first reference was saved from a run of 45 failures; the tool now prevents that).
- **Cost by part.** A table of where the money goes: prompt parts (offer, projects, experiences, skills, instructions) and answer parts, so each optimisation is aimed at a real share of the bill.
- **Case-by-case comparison with a confidence interval.** Added after we suspected a result was chance (next section). It says on how many offers a figure improved, worsened or stayed the same, the mean change, its 95 % interval, and whether it is probably real.
- **Inspection.** Options to print the exact request, the raw answer, the answer as the app reads it, and a dry run that sends nothing.
- **Comparing two saved references** without calling the AI again, and a `--help` that documents every option.

## What we tried, and what it gave

Every idea below was tested with the evaluation tool. Figures come from those measurements; the test set grew over time (5, then 15, then 45 offers), so each row says which set it was measured on.

| Idea | Result | Verdict |
| --- | --- | --- |
| Send every AI call through a Go gateway with timeouts, retries and strict JSON | First real call worked in 29 s; failures became bounded and explicit; changing provider became a configuration change | Positive |
| Short labels (E1, P3, S2) instead of ids, every label validated in code | Invented ids 0.33 to 0 per ranking. One model had dropped a character of an 8-character id | Positive |
| Ask the model to rate every entry (levels 0 to 3), let the code choose within limits | Forgotten entries 5.4 to 0; recall 51 % to 73 % on 5 offers | Positive |
| Delete six answer fields no screen read, and a hidden AI-context input | Fewer output tokens, and it removed a hard-coded personal profile text that had been sent to the model for every user | Positive |
| Ask for minified JSON on one line (the model was indenting its answer) | Output 657 to 422 tokens on one offer (minus 36 %), same quality | Positive |
| Compact answer: all levels in one map, tags picked by number, new tags only | Output 954 to 457 tokens on Medium; cost per ranking minus 31 % | Positive |
| Move from OVHcloud (Llama 3.3 70B) to Mistral | Median time 21 s (worst 93 s) to 3 to 6 s, no more timeouts | Positive, hosting review still to do |
| Test the small model against the large one on a wider set | Mistral Small matches Mistral Medium (recall 68 % against 66 % on 45 offers) at one eleventh of the cost | Positive |
| JSON Schema on the answer (labels and levels as allowed values) | The provider enforces it: ordered to answer "E9, level 7", the model returned a valid label. Quality unchanged | Neutral, kept in a simple form |
| Clean the offer with rules (drop benefits, about-us, equal-opportunity text) | Minus 2 % cost, same quality: little to remove in real offers | Neutral |
| Put the unchanging parts of the prompt first, to help provider caching | Quality unchanged; the saving cannot be seen from our side | Neutral |
| Shorter keys, alternative formats such as TOON and LEAN | Researched, not built: structure is a small share of the tokens, most of them are free text | Neutral, skipped |
| A reasoning model (gpt-oss-120b) | No answer after two minutes: far too slow for a button | Negative |
| First JSON Schema with exact item counts and text lengths | 8 of 15 calls failed on OVHcloud: the server took too long to build its grammar. Simplified | Negative |
| Write the answer in YAML | Looked like plus 8 points of recall on 15 offers, nothing on 45 (see the next section) | False positive |
| Write the library in YAML in the prompt | Plus 10 % input tokens, lower recall | Negative |
| Fictional offers written to extend the test set | Written by us with tidy sections, so they flattered the offer-cleaning step and could not be trusted as a measure; replaced by real offers | Negative |

## Is it chance? Widening the test set

A YAML answer format looked like a clear win on 15 offers: recall up 8 points, better on 11 offers out of 15, a 95 % interval from plus 2 to plus 13 points. On 45 real offers the same comparison gave zero. The gap between those two results is the most useful thing the project taught.

| Comparison | Offers | Mean change in recall | 95 % interval | Reading |
| --- | --- | --- | --- | --- |
| YAML against JSON, Medium | 15 | plus 8 points | plus 2 to plus 13 | looked real |
| YAML against JSON, Medium | 45 | 0 points | minus 6 to plus 6 | nothing |
| Small against Medium, JSON | 15 | minus 2 points | minus 11 to plus 6 | no difference |
| Small against Medium, JSON | 45 | plus 1 point | minus 3 to plus 5 | no difference |

We had doubted the first result for three reasons, and acted on each:

1. **Few offers, coarse figures.** With about ten expected entries per offer, one entry more or less moves an offer by 10 points. A few points of average on five offers is easily chance. The test set grew from 5 offers to 15, then to **45 real offers**.
2. **Repeating a run adds little.** With the same prompt the model answers almost the same way each time, so three runs are not three independent samples. The tool now compares **case by case**, with a confidence interval, and we use one run per offer: more offers narrow the interval, more runs barely do.
3. **Variety.** Ten of the 15 offers had been written by us. They were replaced by real ones: 16 offers saved on the production site in a single day plus 29 saved earlier, covering low-level and operating systems, embedded, infrastructure, cybersecurity, networking, full-stack, quantitative finance, AI and one consulting offer, in French and English, from 1,000 to 8,000 characters. Three offers with no real job description (spontaneous applications) were set aside because they have no right answer.

One limit remains and is stated plainly: some offers are a poor fit for the author's library (a consulting role, a full-stack role in a different stack). On those, the expected selection is the least bad available and recall is low for every variant. That is label noise, not a model defect, and the next step is to audit those cases one by one.

## Does a bigger library break it? A stress test

Every result above comes from one library of 21 entries. A real user may have 40 or 50. Before opening the product to a school, one question needed an answer: does a model that works on 21 entries keep finding the right ones among 57? Three ideas were on the table: cut the descriptions in the prompt (rejected: a keyword at the end of a description can be the one the offer asks for, and the loss is silent), shortlist the entries before the model reads them (a keyword filter favours technical vocabulary, which is wrong for a product meant for other fields), or **set limits so that a full library fits, and measure whether the model copes**. We took the third.

**Method.** The evaluation tool gained `--pad n`: it buries each of the 45 libraries in `n` fictional experiences, projects and skills from many fields (health, teaching, law, trades, writing, some technical ones), half before and half after the real entries so that the real ones sit in the middle of the list, where a long prompt is hardest to read. None of the fictional entries is ever expected, so a pick among them is visible. `--pad-length n` makes their descriptions long (they are 120 to 180 characters otherwise; the application allows 1,000). A **control run** with the same code and no padding gives the noise to compare against.

**The noise first.** Two identical runs of the same code differ by 0 points on average (interval minus 4 to plus 4), but **23 offers of 45 change and 4 of them swing by 30 points or more**. A big change on one offer proves nothing.

| Library | Entries | Tokens in / out | Recall against control | Precision against control | Picks per offer | Fictional picks | Cost per ranking | Time, median / worst |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Control (the real library) | 21 | 2.9k / 0.46k | 68 % | 78 % | 8.5 | none | 0.0006 EUR | 3.5 s / 5.2 s |
| Plus 3 of each kind | 30 | 3.3k / 0.56k | plus 7.3 (plus 1.5 to plus 13.0) | minus 8.5 | 10.3 | not counted | 0.0007 EUR | 3.9 s / 10.6 s |
| Plus 7 (the caps of the app) | 42 | 3.7k / 0.66k | plus 5.1 (minus 2.2 to plus 12.3) | minus 8.4 | 10.0 | 2 of 450 | 0.0008 EUR | 4.1 s / 8.3 s |
| Plus 12 | 57 | 4.3k / 0.78k | plus 0.5 (minus 6.1 to plus 7.0) | minus 12.2 | 9.9 | 6 of 446 | 0.0010 EUR | 5.9 s / 56.7 s |
| Plus 7, descriptions of 800 characters | 42 | 5.5k / 0.62k | minus 4.2 (minus 9.8 to plus 1.4) | minus 9.0 | 9.0 | 2 of 405 | 0.0010 EUR | 3.9 s / 7.8 s |
| Plus 12, descriptions of 1,000 characters | 57 | 8.3k / 0.76k | plus 1.0 (minus 5.7 to plus 7.7) | minus 15.8 | 10.5 | 5 of 472 | 0.0015 EUR | 4.3 s / 6.4 s |

**The commands, and what each one showed.** Everything was run with the evaluation tool, on the 45 real offers, against the gateway running Mistral Small.

| Argument | What it does |
| --- | --- |
| `--model mistral-small-2603` | Sets the prices used for the cost columns. It does **not** choose the model: the gateway answers with the model it was started with. |
| `--runs 1` | One run per offer. The answers are nearly the same from run to run, so more runs add little; more offers do. |
| `--baseline small45` | The saved reference to compare with: Mistral Small on the 45 offers, 2026-10-09. The comparison is made offer by offer, with a 95 % interval. |
| `--label name` | A name for this run, written in its results file in `eval/results/`. |
| `--pad n` | Buries each library in `n` fictional entries of each kind (from `eval/distractors.json`), real entries in the middle. |
| `--pad-length n` | With `--pad`: makes the fictional descriptions about `n` characters long. |
| `--case text` | Only the offers whose name contains the text. |
| `--runs 5 --details` | Repeats an offer and prints, for the first run, what the model missed and added. With several runs it also reports the stability. |
| `--sizes` | Prints the size of the request for every offer, part by part (instructions, library, offer, schema) and the minimum, median, 90th percentile and maximum. No call to the AI, no cost, no gateway needed. |

How to read the comparison the tool prints: "better on 22, worse on 14, same on 9" counts offers; the mean change comes with a 95 % interval; the tool says "probably real" only when the interval does not include zero, and "could be chance" otherwise.

```bash
# 1. Control: the same code, no padding. Measures the noise between two identical runs.
npm run eval:ranking -- --model mistral-small-2603 --runs 1 --baseline small45 --label control

# 2. The library buried in 3, 7 and 12 fictional entries of each kind (about 30, 42 and 57 entries).
npm run eval:ranking -- --model mistral-small-2603 --runs 1 --baseline small45 --pad 3 --label pad3
npm run eval:ranking -- --model mistral-small-2603 --runs 1 --baseline small45 --pad 7 --label pad7
npm run eval:ranking -- --model mistral-small-2603 --runs 1 --baseline small45 --pad 12 --label pad12

# 3. One offer that collapsed, five times, to see whether it is an accident.
npm run eval:ranking -- --model mistral-small-2603 --runs 5 --case efficientip --pad 7 --details

# 4. The same, with long descriptions (800 and 1,000 characters).
npm run eval:ranking -- --model mistral-small-2603 --runs 1 --baseline small45 --pad 7 --pad-length 800 --label pad7-long800
npm run eval:ranking -- --model mistral-small-2603 --runs 1 --baseline small45 --pad 12 --pad-length 1000 --label pad12-long1000

# 5. How big the request is, without calling the AI.
npm run eval:ranking -- --sizes --pad 7 --pad-length 800
```

| Command | Question | Result | Conclusion |
| --- | --- | --- | --- |
| 1. Control | How much do two identical runs differ? | Recall 68 % to 68 % (interval minus 4 to plus 4), precision 78 % to 78 %; 23 offers of 45 change, 4 by 30 points or more | The noise is about 4 points on the mean and large per offer: no conclusion from one offer |
| 2. `--pad 3`, `--pad 7`, `--pad 12` | Does a bigger library hide the right entries? | Recall plus 7.3, plus 5.1, plus 0.5 points against the control (the last two within the noise); precision minus 8 to minus 12; 0.4 to 1.3 % of picks fictional | No: the model finds the right entries and is more generous. It costs 0.0007 to 0.0010 EUR per ranking |
| 3. `--case efficientip --pad 7 --runs 5 --details` | Is the collapse to 0 % an accident? | Mean recall 40 %, stability 35 % (the offer changes its answer from run to run); it missed an experience and two projects in the first run | Unstable on this offer. Not compared with five plain runs of the same offer, so it does not say whether the padding is the cause: inconclusive |
| 4. `--pad 7 --pad-length 800`, `--pad 12 --pad-length 1000` | Do long descriptions change anything? | Recall minus 4.2 and plus 1.0 against the control (within the noise), no failure, worst time 7.8 s and 6.4 s, 0.0010 and 0.0015 EUR | No: it holds with prompts of 5.5k and 8.3k tokens |
| 5. `--sizes --pad ... --pad-length ...` | How big are these requests? | Median / maximum characters: 22,153 / 28,543 (plus 7, 800), 30,818 / 37,208 (plus 12, 800), 35,557 / 41,947 (plus 12, 1,000) | Close to the 47,843 of a library at every cap, which a test keeps under the 60,000-character limit |

**What it shows.**

- **The model keeps finding the right entries.** From 21 to 57 entries, and with descriptions up to the 1,000-character limit, recall stays within the noise, no answer fails and no id is invented. The largest prompt tested is about 42,000 characters, against 47,800 for a library at every cap.
- **It becomes more generous, not worse.** Precision against the author's strict list falls by 8 to 16 points. The first reading was that the model was being fooled by the fictional entries; counting the picks said otherwise: only 0.4 to 1.3 % of the recommendations are fictional. What changes is that the model recommends about 1.5 more *real* entries per offer, which lowers precision and raises recall. The resume caps (two to four experiences, three to five projects) bound what is printed anyway.
- **A flattering first number was noise.** Against the old reference, 30 entries looked like a real gain of 7 points in recall. Padding cannot help find entries that were already there: the gain was partly the model's added generosity and partly noise, which only a control run of the same day could separate. The same control showed that the "offers that lose 30 points" were largely offers whose control run happened to be lucky.
- **A slow run was not the size.** One run had 9 offers above 20 seconds and a worst case of 56.7 seconds. The slow offers had the same token counts as the fast ones, and two later runs with prompts twice as long never exceeded 7.8 seconds. It was the provider having a slow moment; attributing it to the library would have led to a wrong decision.
- **A silent failure appeared.** On one offer the model rated every entry 0, so the code recommended no experience and no project, with no error (recall 0 %, and 1,545 output tokens instead of about 850). In one padded run, 5 offers of 45 had no project recommended. Nothing in the tool or the application flags it yet: this is tracked in #218 (fill an empty type, and make the tool report it).
- **A setup mistake the tool could not see.** The first padded run was started against a gateway still running Llama: `--model` only chooses the prices, the gateway chooses the model, so Mistral Small prices were shown on Llama answers and only the time gave it away. #218 also adds a check that compares the model that answered with the one asked for.

**Decision.** Keep the limits as the answer: a description of at most 1,000 characters (a one-page resume cannot hold more), an offer of at most 12,000, a library of at most 10 experiences, 20 projects, 10 skills and 10 education entries, a prompt of at most 60,000 characters. A test keeps the arithmetic true: a library at every cap with an offer at its limit is 47,843 characters. No shortlist for now, and the question stays open in #216, to be reopened if real users often hit the limit or if a profile from outside tech shows a quality problem.

**What this test does not cover.** The fictional entries are artificial: the long ones are built by chaining short descriptions, so they mix topics, and about a third are close to technical work. Only one real library is used. The prompt tested stops at 42,000 characters. And no library from a field outside tech has been tried, which is the case that matters most for where the product wants to go.

## Where it stands and what is next

The ranking runs in production on **Mistral Small with a JSON answer**, through the gateway, since 2026-10-09: 0.60 EUR per 1,000 rankings, about 3 seconds, no failures on 45 offers. The first ranking made on the live site used 2,690 tokens in and 450 out, as measured (about 0.0006 EUR). The hosting and data review was done before the switch: Mistral AI is a French company with a European endpoint, training on the data is switched off, and the privacy page says exactly that, behind flags that a test refuses to set wrongly.

Around the model, the product is protected against abuse and runaway cost, each layer measured or tested:

- **Sizes** of every field the user writes (an offer of 12,000 characters, a description of 1,000), refused with a message that names the field and the limit; a request body is cut off before it is read.
- **Creation limits**: a cap on jobs and entries and a rate per hour and per day, counted on what is *created*, so creating and deleting in a loop is stopped.
- **AI quotas**: per user 10 rankings an hour, 20 a day, 50 a week; a monthly cap of 3 EUR for the whole site computed from the real tokens of every call, checked under a lock so calls made at the same time cannot all slip under it; a kill switch in the gateway; a warning at 80 % of the cap. The spending limit set at the provider is 10 EUR.
- **A prompt that is checked before it is sent**, with a message that says what takes the room.

Next, in order:

1. **Guard against an empty answer** (#218), and a check that the gateway runs the model the evaluation asks for.
2. **Compare our cost with the provider's invoice** every night (#212): our figure is an upper bound built from a price table written by hand, and nothing yet says how far it is.
3. **Test other libraries**, including one from a field outside tech. Everything so far is judged against one person's profile.
4. **Audit the low-recall offers.** For each, decide whether the model is wrong or the expected selection was debatable, and fix the cases before tuning anything else.
5. **Cheap quality ideas, now affordable at 0.0006 EUR per ranking**: combine two answers from the small model, test variants of the instructions, cache a ranking by the hash of its input, and shortlist entries with embeddings only if real use shows the limits are not enough (#216).
6. **Keep a hold-out set** of offers never looked at while tuning, used only to confirm a change at the end.

## Lessons and honest limits

Lessons that carry beyond this project:

- **Measure before optimising, and measure the right thing.** The cost table showed that output tokens, not the prompt, dominated the bill for the large model, which pointed to the first real savings.
- **Treat a model's output as untrusted input.** Short labels, validation and rules in code removed a whole class of failures that no prompt wording had fixed.
- **Separate judging from deciding.** The model rates; the code applies limits. Counts and thresholds are things models do poorly.
- **Cut what nobody reads.** Six answer fields no screen used were being generated, and paid for, on every call.
- **Doubt a good result.** The format that looked best on 15 offers was nothing on 45. Statistics matter most when the sample is small and the result is flattering.
- **A bigger model is not an answer by itself.** The model ten times cheaper matched the larger one once the pipeline around it was right.
- **Run a control before believing a difference.** A run of the unchanged code showed that two identical runs differ by 4 points on the mean and by 30 on four offers; without it, a plus 7 would have been read as a result.
- **Look at what changed, not only at the score.** Counting the picks showed that a drop in precision came from a more generous model, not from the distractors we suspected.
- **Do not blame the change for what a rerun does not reproduce.** The slow run was the provider.
- **Make a tool refuse its own silent mistakes.** A run against the wrong model, and a ranking with nothing in it, both passed without a warning.
- **Keep the evaluation data private and the tooling public.** Cases hold personal data and stay out of the repository; the tool, its tests and its documentation do not.

Limits, stated plainly:

- **One profile.** Every result is judged against a single person's library, oriented to systems and low-level work. Other profiles may behave differently.
- **Subjective expected answers.** The expected selections are choices, not facts. Many were proposed with an AI assistant and are subject to the author's validation; offers that fit the library poorly add noise to every variant.
- **Costs are upper bounds.** They apply the full price and ignore any caching discount the provider may give.
- **Stress test on fictional entries.** The distractors are artificial and from a handful of fields, and no real library other than the author's has been measured.
- **No cross-check with the invoice yet.** The cost of every call is added up from the tokens and a hand-written price table; the nightly comparison with the provider's figures is planned (#212).
