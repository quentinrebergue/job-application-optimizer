# String Dynamic Programming

## Concept
Use a 2D table `dp[i][j]` where `i` indexes into string `s` and `j` indexes into string `t` (or pattern `p`). Each cell represents whether/how well `s[0..i-1]` matches `t[0..j-1]`.

## Common Recurrences

### Wildcard Matching (`?` and `*`)
```text
dp[i][j] = true if s[0..i-1] matches p[0..j-1]

Base:
  dp[0][0] = true
  dp[0][j] = dp[0][j-1]  if p[j-1] == '*'

Transition:
  if p[j-1] == '?' or p[j-1] == s[i-1]:
    dp[i][j] = dp[i-1][j-1]
  elif p[j-1] == '*':
    dp[i][j] = dp[i-1][j]   // '*' matches one more char
             OR dp[i][j-1]  // '*' matches empty string
```

### Edit Distance (Levenshtein)
```text
dp[i][j] = min edits to transform s[0..i-1] to t[0..j-1]

if s[i-1] == t[j-1]: dp[i][j] = dp[i-1][j-1]
else: dp[i][j] = 1 + min(
  dp[i-1][j],   // delete from s
  dp[i][j-1],   // insert into s
  dp[i-1][j-1]  // replace
)
```

### Longest Common Subsequence (LCS)
```text
if s[i-1] == t[j-1]: dp[i][j] = dp[i-1][j-1] + 1
else: dp[i][j] = max(dp[i-1][j], dp[i][j-1])
```

## Implementation Template (Wildcard — C++)

```cpp
bool isMatch(string s, string p) {
    int m = s.size(), n = p.size();
    vector<vector<bool>> dp(m + 1, vector<bool>(n + 1, false));
    dp[0][0] = true;
    for (int j = 1; j <= n; j++)
        dp[0][j] = dp[0][j-1] && p[j-1] == '*';
    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (p[j-1] == '*')
                dp[i][j] = dp[i-1][j] || dp[i][j-1];
            else if (p[j-1] == '?' || p[j-1] == s[i-1])
                dp[i][j] = dp[i-1][j-1];
        }
    }
    return dp[m][n];
}
```

## Space Optimization
All three recurrences only look at the previous row → reduce to O(n) space using a 1D array (be careful with update order).

## Complexity
- Time: O(m × n)
- Space: O(m × n), reducible to O(n)

## Classic Problems
- Wildcard Matching, Regular Expression Matching, Edit Distance, LCS, Distinct Subsequences
