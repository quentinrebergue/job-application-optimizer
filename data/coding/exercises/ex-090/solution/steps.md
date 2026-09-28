# Solution Approach: Hash Set

## Pattern Recognition
→ **Hash Map (Set)** — we only need to know "have I seen this value before," which a hash set answers in O(1).

## Steps

1. Create an empty set `seen`.
2. For each `num` in `nums`:
   - If `num` is already in `seen`, return `True`.
   - Otherwise add `num` to `seen`.
3. If the loop finishes without a match, return `False`.

## Why This Works
A hash set gives O(1) average membership checks, so a single pass is enough to catch the first repeat — no need to sort or compare every pair.

## Complexity
- Time: O(n)
- Space: O(n)
