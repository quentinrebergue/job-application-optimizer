# Solution Approach: Variable Sliding Window

## Pattern Recognition
→ **Variable Sliding Window** — expand right to grow the sum, shrink left once the condition is met to minimize the length.

## Steps

1. `left = 0`, `sum = 0`, `minLen = Infinity`.
2. For `right` from 0 to n-1:
   - `sum += nums[right]`.
   - While `sum >= target`:
     - Update `minLen = min(minLen, right - left + 1)`.
     - `sum -= nums[left++]` (shrink from left).
3. Return `minLen === Infinity ? 0 : minLen`.

## Why Shrink While Sum ≥ Target?
Every element is positive, so removing the leftmost element can only decrease the sum. We keep shrinking as long as the sum stays valid — this finds the shortest window ending at each `right`.

## O(n log n) Follow-Up
Use prefix sums + binary search: for each `right`, binary search for the smallest `left` such that `prefix[right+1] - prefix[left] >= target`.

## Complexity
- Time: O(n) — each element enters and leaves the window at most once
- Space: O(1)
