# Solution Approach: Backtracking

## Pattern Recognition
→ **Backtracking** — build permutations incrementally; at each step choose any unused number, recurse, then un-choose.

## Steps

1. Initialize `result = []`, `used = new Set()`.
2. Define `backtrack(path)`:
   - If `path.length === nums.length`: push `[...path]` to result and return.
   - For each `num` in `nums`:
     - If `used.has(num)`, skip.
     - `used.add(num)`, `path.push(num)`.
     - Recurse: `backtrack(path)`.
     - `path.pop()`, `used.delete(num)`.
3. Call `backtrack([])` and return `result`.

## Alternative: Swap In-Place
Avoid the `used` set by swapping `nums[i]` with `nums[start]` at each level. This generates all permutations without extra memory for the `used` set.

## Complexity
- Time: O(n! × n) — n! permutations, each taking O(n) to copy
- Space: O(n) recursion depth + O(n!) output
