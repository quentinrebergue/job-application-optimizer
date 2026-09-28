# Solution Approach: Prefix Sum (Count of Odds)

## Pattern Recognition
→ **Prefix Sum** — reframe: count subarrays where the number of odd elements equals exactly `k`.

## Key Insight
Let `prefix[i]` = number of odd numbers in `nums[0..i-1]`. A subarray `nums[l..r]` is nice when `prefix[r+1] - prefix[l] === k`, i.e., `prefix[l] === prefix[r+1] - k`.

This is identical to "Subarray Sum Equals K" with `nums[i]` replaced by `nums[i] % 2`.

## Steps

1. `count = new Map<number, number>([[0, 1]])` (prefix count 0 has one occurrence: empty prefix).
2. `odds = 0`, `result = 0`.
3. For each `num` in `nums`:
   - `odds += num % 2`.
   - `result += count.get(odds - k) ?? 0`.
   - `count.set(odds, (count.get(odds) ?? 0) + 1)`.
4. Return `result`.

## Sliding Window Alternative
`atMost(k) - atMost(k-1)` where `atMost(k)` = number of subarrays with at most `k` odd numbers. Two-pass O(n), same complexity.

## Complexity
- Time: O(n)
- Space: O(n) for the prefix count map
