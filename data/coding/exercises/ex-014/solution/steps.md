# Solution Approach: Expand Around Center

## Pattern Recognition
→ **Two Pointers (expand outward)** — a palindrome mirrors around its center; expand from each center and track the longest.

## Key Insight
There are `2n - 1` possible centers in a string of length `n`:
- `n` centers on single characters (odd-length palindromes)
- `n - 1` centers between characters (even-length palindromes)

## Steps

1. Iterate center index `c` from 0 to 2n-2.
2. Determine `left` and `right` start based on parity:
   - Odd: `left = right = c / 2`
   - Even: `left = c / 2`, `right = c / 2 + 1`
3. Expand while `s[left] == s[right]` and indices are in bounds.
4. When expansion stops, palindrome length = `right - left - 1`.
5. Track `start` and `maxLen` of the best palindrome.
6. Return `s.slice(start, start + maxLen)`.

## Alternative: DP
`dp[i][j] = true` if `s[i..j]` is a palindrome: `s[i] == s[j] && dp[i+1][j-1]`. O(n²) time + space.

Expand-around-center is preferred: same time, O(1) space.

## Complexity
- Time: O(n²) — n centers × O(n) expansion each
- Space: O(1)
