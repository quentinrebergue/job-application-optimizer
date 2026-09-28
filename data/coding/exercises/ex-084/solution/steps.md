**Pattern: DP (O(n²)) or Patience Sort (O(n log n))**

DP: `dp[i]` = LIS ending at index i. `dp[i] = max(dp[j]+1)` for all j < i where `nums[j] < nums[i]`.

O(n log n): maintain a "tails" array where `tails[i]` is the smallest tail of all LIS of length i+1. Binary search to place each element.
