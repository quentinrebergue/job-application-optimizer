# Solution Approach: 1D DP over String Prefixes

## Pattern Recognition
→ **Dynamic Programming (String DP)** — `dp[i]` means "the prefix `s[:i]` can be fully segmented." It's true if there's some earlier valid split point `j` such that `dp[j]` is true and `s[j:i]` is a dictionary word.

## Steps

1. Convert `wordDict` to a set for O(1) lookups.
2. Allocate `dp = [False] * (len(s) + 1)`, with `dp[0] = True` (empty prefix is trivially segmentable).
3. For `i` from 1 to `len(s)`:
   - For `j` from 0 to `i - 1`:
     - If `dp[j]` is true and `s[j:i]` is in the word set, set `dp[i] = True` and break.
4. Return `dp[len(s)]`.

## Why This Works
Every valid segmentation of `s[:i]` ends with some dictionary word `s[j:i]`, and everything before that word (`s[:j]`) must itself be validly segmentable — exactly what `dp[j]` tracks. Building up from the empty prefix avoids re-deriving the same sub-segmentations.

## Complexity
- Time: O(n² ) — n² split points, each doing an O(1) average hash lookup (ignoring substring slicing cost)
- Space: O(n) for `dp`, plus O(Σ) for the word set
