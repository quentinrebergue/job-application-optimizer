# Solution Approach: 2D Dynamic Programming

## Pattern Recognition
→ **String DP** — `dp[i][j]` = true if `s[0..i-1]` matches `p[0..j-1]`.

## Steps

1. Allocate `dp[m+1][n+1]`, initialize all `false`.
2. Base cases:
   - `dp[0][0] = true` (empty matches empty).
   - `dp[0][j] = dp[0][j-1] && p[j-1] === '*'` (leading `*`s match empty string).
3. Fill row by row:
   - `p[j-1] === '*'`:
     - `dp[i][j] = dp[i-1][j]` (star matches one more char of s)
     - OR `dp[i][j-1]` (star matches empty — ignore the star)
   - `p[j-1] === '?' || p[j-1] === s[i-1]`:
     - `dp[i][j] = dp[i-1][j-1]`
   - Otherwise: `dp[i][j] = false`.
4. Return `dp[m][n]`.

## Why dp[i-1][j] for `*` matching a character?
`dp[i-1][j]` means `s[0..i-2]` matched `p[0..j-1]` with the `*` already in play, and we're extending the match by one more character in `s`.

## Complexity
- Time: O(m × n)
- Space: O(m × n), reducible to O(n) with a 1D rolling array
