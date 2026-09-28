# Solution Approach: Hash Set, Only Start Counting at Sequence Heads

## Pattern Recognition
→ **Hash Map (Set)** — put every number in a set for O(1) lookups, then only start counting a sequence from a number that is a "sequence start" (its predecessor isn't in the set). This avoids re-walking the same run from every one of its members.

## Steps

1. Put all of `nums` into a set `num_set`.
2. For each `num` in `num_set`:
   - If `num - 1` is in `num_set`, skip it — it's not the start of a run, and will be (or was) counted from its actual start.
   - Otherwise, walk forward: `length = 1`, then while `num + length` is in `num_set`, increment `length`.
   - Update `best = max(best, length)`.
3. Return `best`.

## Why This Works
Each run of consecutive numbers is only ever walked once — from its start — because every other member of the run fails the "predecessor in set" check and gets skipped. That guarantees a total of O(n) work across all runs combined, even though it looks like nested loops.

## Complexity
- Time: O(n)
- Space: O(n)
