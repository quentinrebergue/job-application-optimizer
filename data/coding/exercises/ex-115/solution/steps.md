# Solution Approach: 1D DP (Fibonacci-Shaped Recurrence)

## Pattern Recognition
→ **Dynamic Programming (String DP)** — the number of ways to decode `s[:i]` depends on whether the last one or two digits form a valid letter: `dp[i] = dp[i-1]` (if the last digit alone is valid) `+ dp[i-2]` (if the last two digits together are valid).

## Steps

1. Let `dp[0] = 1` (empty prefix: one way — decode nothing) and `dp[1] = 1` if `s[0] != '0'` else `0`.
2. For `i` from 2 to `len(s)`:
   - If `s[i-1] != '0'`, add `dp[i-1]` (treat the last digit as its own letter).
   - If `10 <= int(s[i-2:i]) <= 26`, add `dp[i-2]` (treat the last two digits as one letter).
3. Return `dp[len(s)]`.

## Why This Works
Every valid decoding of `s[:i]` ends either with a single-digit letter (contributing `dp[i-1]` ways for everything before it) or a two-digit letter (contributing `dp[i-2]` ways). Summing both possibilities — while respecting that `'0'` can never start a letter on its own — covers every decoding exactly once.

## Complexity
- Time: O(n)
- Space: O(n), reducible to O(1) with two rolling variables
