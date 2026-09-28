# Solution Approach: Binary Search on Answer

## Pattern Recognition
→ **Binary Search on the answer space** — the answer lies between `max(nums)` (each element is its own subarray) and `sum(nums)` (one subarray). Binary search for the smallest feasible bound.

## Steps

1. Set `left = max(nums)`, `right = sum(nums)`.
2. Binary search:
   - `mid = (left + right) / 2`.
   - Count minimum subarrays needed to keep all sums ≤ mid (greedy: add elements until adding the next would exceed `mid`, then start a new subarray).
   - If `splits <= k`: `mid` is feasible → search lower: `right = mid`.
   - Else: need larger bound → `left = mid + 1`.
3. Return `left`.

## Why Binary Search Works Here
The feasibility function (can we split into ≤ k parts with max sum ≤ x?) is **monotone**: if x is feasible, any x' > x is also feasible. Binary search finds the minimum feasible x.

## Complexity
- Time: O(n log(sum)) — log(sum) iterations, each O(n) greedy check
- Space: O(1)
