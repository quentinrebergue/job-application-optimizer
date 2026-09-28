# Solution Approach: Backtracking

## Pattern Recognition
→ **Backtracking** — build a combination by repeatedly choosing a candidate; if the running sum exceeds the target, undo the last choice and try the next one. Allowing reuse just means we don't advance the start index after picking the same candidate again.

## Steps

1. Sort `candidates` (lets us prune early once a candidate is too large).
2. Define `backtrack(start, remaining, path)`:
   - If `remaining == 0`, record a copy of `path` and return.
   - For `i` from `start` to the end of `candidates`:
     - If `candidates[i] > remaining`, break (sorted, so all later ones are too big too).
     - Choose it: `path.append(candidates[i])`.
     - Recurse with `backtrack(i, remaining - candidates[i], path)` — reuse allowed, so `i` not `i + 1`.
     - Undo: `path.pop()`.
3. Call `backtrack(0, target, [])` and return the collected results.

## Why This Works
Sorting lets us stop scanning a branch as soon as a candidate overshoots the remaining target, instead of exploring every combination blindly. Passing `i` (not `i + 1`) into the recursive call is what allows a candidate to be picked more than once, without ever producing permutations of the same multiset.

## Complexity
- Time: O(2^target) worst case — exponential in the branching factor, bounded by pruning
- Space: O(target) recursion depth
