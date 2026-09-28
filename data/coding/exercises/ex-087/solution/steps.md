**Pattern: 2D DP**

`dp[i][j]` = LCS of text1[0..i-1] and text2[0..j-1]. If chars match: `dp[i][j] = dp[i-1][j-1] + 1`. Else: `dp[i][j] = max(dp[i-1][j], dp[i][j-1])`. Answer is `dp[m][n]`.
