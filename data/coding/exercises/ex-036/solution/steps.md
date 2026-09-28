# Solution Approach: Sliding Window with Unique-Count Constraint

## Why Not Pure Sliding Window?
A character with freq < k **cannot** appear in any valid substring. This splits the problem into independent subproblems — hence divide & conquer works. But a cleaner O(n) approach uses the "at most T unique chars" constraint.

## Sliding Window Approach (O(26n))

For each target number of unique characters `T` from 1 to 26:
1. Use a sliding window that maintains **exactly T unique characters**.
2. Track `countAtLeastK` = number of unique chars with freq ≥ k.
3. Window is valid when `countAtLeastK === T` (all unique chars have freq ≥ k).
4. Expand right freely; shrink left when unique count exceeds T.
5. Update max length whenever window is valid.

## Steps (for a fixed T)

1. `left = 0`, `freq = {}`, `unique = 0`, `countAtLeastK = 0`.
2. For each `right`:
   - Add `s[right]` to freq. If new: `unique++`. If freq hits k: `countAtLeastK++`.
   - While `unique > T`: remove `s[left]`. If freq drops to 0: `unique--`. If freq drops below k: `countAtLeastK--`. `left++`.
   - If `unique === T && countAtLeastK === T`: update max.
3. Repeat for T = 1 to 26.

## Complexity
- Time: O(26 × n) = O(n)
- Space: O(26) = O(1)
