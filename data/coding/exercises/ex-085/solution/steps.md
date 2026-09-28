**Pattern: Bottom-up DP (Unbounded Knapsack)**

`dp[i]` = min coins for amount i. Initialize dp[0]=0, rest=Infinity. For each amount i, try each coin: `dp[i] = min(dp[i], dp[i-coin]+1)`. Answer is dp[amount] (or -1 if Infinity).
