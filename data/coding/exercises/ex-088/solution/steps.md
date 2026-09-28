**Pattern: Interval DP (think last burst)**

Add 1 sentinels at both ends. `dp[l][r]` = max coins bursting all balloons between l and r (exclusive). For each k in (l,r): `dp[l][r] = max(dp[l][k] + nums[l]*nums[k]*nums[r] + dp[k][r])`. k is the LAST balloon burst in interval.
