# Solution Approach: Math / Greedy Formula

## Pattern Recognition
→ **Greedy with frequency counting** — the most frequent task determines the structure of the schedule.

## Key Insight
Let `maxFreq` = highest task frequency, `countMax` = number of tasks with that frequency.

Imagine placing tasks in a grid:
```
  (n+1 columns wide, maxFreq-1 rows)
  A _ _ | A _ _ | ... | A [last tasks]
```
Each row is one "round" of n+1 slots. The minimum intervals = `(maxFreq - 1) * (n + 1) + countMax`.

But if tasks are dense enough, the schedule needs no idles and `tasks.length` is the answer.

**Formula**: `max(tasks.length, (maxFreq - 1) * (n + 1) + countMax)`

## Steps

1. Count frequency of each task.
2. Find `maxFreq` and `countMax` (number of tasks with that frequency).
3. Return `Math.max(tasks.length, (maxFreq - 1) * (n + 1) + countMax)`.

## Complexity
- Time: O(n) to count frequencies
- Space: O(1) — at most 26 distinct tasks
