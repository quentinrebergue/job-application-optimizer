def max_coins(nums: list[int]) -> int:
    arr = [1] + nums + [1]
    n = len(arr)
    dp = [[0] * n for _ in range(n)]

    for length in range(2, n):
        for l in range(0, n - length):
            r = l + length
            for k in range(l + 1, r):
                dp[l][r] = max(dp[l][r], dp[l][k] + arr[l] * arr[k] * arr[r] + dp[k][r])

    return dp[0][n - 1]
