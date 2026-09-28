# Solution Approach: Hash Map

## Pattern Recognition
→ **Hash Map Lookup** — we need to find a pair summing to target in O(n).

## Steps

1. Create an empty hash map `seen: {value → index}`.
2. Iterate through `nums` with index `i` and value `num`.
3. Compute `complement = target - num`.
4. If `complement` is in `seen`, return `[seen[complement], i]` — we found the pair.
5. Otherwise, store `seen[num] = i` and continue.
6. (We never reach here given the problem guarantees a solution.)

## Why This Works
At each step we ask: "Has the number I need to complete the pair already appeared?" The hash map answers this in O(1). We process each element once → O(n) total.

## Complexity
- Time: O(n)
- Space: O(n)
