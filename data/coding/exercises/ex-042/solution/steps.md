# Solution Approach: Variable Sliding Window (At Most 2 Distinct)

## Pattern Recognition
→ **Variable Sliding Window** — reframe: find the **longest subarray with at most 2 distinct fruit types**.

## Steps

1. `basket = new Map<number, number>()` (fruit type → count), `left = 0`, `max = 0`.
2. For `right` from 0 to n-1:
   - Add `fruits[right]` to basket (increment count).
   - While `basket.size > 2`:
     - Decrement `basket.get(fruits[left])`. If count reaches 0: delete from map.
     - `left++`.
   - `max = Math.max(max, right - left + 1)`.
3. Return `max`.

## Generalization
This is "longest subarray with at most K distinct values." Change `2` to `K` for the general version.

## Complexity
- Time: O(n) — each element enters/leaves the window once
- Space: O(1) — at most 3 entries in the map at any time
