# Solution Approach: DP via Lowest Set Bit

## Pattern Recognition
→ **Dynamic Programming** — `bits(i)` relates directly to a smaller previously-computed value: `bits(i) = bits(i & (i-1)) + 1`, where `i & (i-1)` clears the lowest set bit of `i`.

## Steps

1. Allocate `ans = [0] * (n + 1)`.
2. For `i` from 1 to `n`:
   - `ans[i] = ans[i & (i - 1)] + 1`.
3. Return `ans`.

## Why This Works
`i & (i - 1)` is `i` with its lowest set bit removed, and that value is always smaller than `i` (so it's already computed). Its bit count plus the one bit we just cleared gives `bits(i)` in O(1) per index.

## Complexity
- Time: O(n)
- Space: O(n) for the output (O(1) extra)
