# Solution Approach: Prefix & Suffix Products

## Pattern Recognition
→ **Prefix Sum (Product variant)** — `answer[i]` is exactly "product of everything before `i`" times "product of everything after `i`." Precompute both running products in two passes instead of dividing.

## Steps

1. Allocate `answer` of the same length as `nums`, filled with `1`.
2. Left pass: `answer[i] = answer[i-1] * nums[i-1]` (running prefix product, `answer[0] = 1`).
3. Right pass: keep a running suffix product `suffix = 1`, iterate from the end, and multiply `answer[i] *= suffix`, then update `suffix *= nums[i]`.
4. Return `answer`.

## Why This Works
Every result is the product of a prefix and a suffix that meet exactly at index `i`. Computing both directions separately and combining them avoids division entirely, which also sidesteps the zero-division edge case.

## Complexity
- Time: O(n)
- Space: O(1) extra (excluding the output array)
