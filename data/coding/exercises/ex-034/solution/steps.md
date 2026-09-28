# Solution Approach: Fixed Window + Hash Set

## Pattern Recognition
→ **Fixed Sliding Window (size 10)** — slide a window of exactly 10 chars and track seen substrings with a hash set.

## Steps

1. If `s.length <= 10`, return `[]` (no room for repetition).
2. Initialize `seen = new Set<string>()`, `result = new Set<string>()`.
3. For `i` from 0 to `s.length - 10`:
   - Extract `sub = s.slice(i, i + 10)`.
   - If `seen.has(sub)`: add to `result`.
   - Else: add to `seen`.
4. Return `[...result]`.

## Why a Result Set?
The same 10-mer could appear 3+ times; the result set avoids duplicates in the output.

## Optimization: Rolling Hash
Instead of `s.slice()` (O(10) per step), use a rolling hash to update in O(1). In practice, the string slice approach is acceptable since the window size is constant (10).

## Complexity
- Time: O(n × 10) = O(n)
- Space: O(n) for the sets
