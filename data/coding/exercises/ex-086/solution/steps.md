**Pattern: 0/1 Knapsack DP**

Target = total/2. If total is odd, immediately false. `dp[j]` = can we make sum j? Iterate each number; update dp backward from target to num: `dp[j] |= dp[j-num]`.
