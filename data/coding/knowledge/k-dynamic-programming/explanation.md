# Dynamic Programming

## Concept
Break a problem into overlapping subproblems. Solve each subproblem once and store the result (memoization or tabulation) to avoid redundant computation.

## When to Use
- Optimization problems (min/max cost, count of ways)
- The problem has optimal substructure (solution builds on subproblem solutions)
- Overlapping subproblems (naive recursion recomputes the same inputs)

## Two Approaches

### Top-Down (Memoization)
Recursive + cache. Natural to write, matches the recurrence directly.

```cpp
unordered_map<int,long long> memo;
long long fib(int n) {
    if (n <= 1) return n;
    if (memo.count(n)) return memo[n];
    return memo[n] = fib(n - 1) + fib(n - 2);
}
```

### Bottom-Up (Tabulation)
Fill a table from smallest subproblems up. Usually more cache-friendly.

```cpp
long long fib(int n) {
    if (n <= 1) return n;
    vector<long long> dp(n + 1);
    dp[0] = 0; dp[1] = 1;
    for (int i = 2; i <= n; i++)
        dp[i] = dp[i-1] + dp[i-2];
    return dp[n];
    // Can reduce to O(1) space: keep only last two values
}
```

## Common Patterns
| Pattern | Example Problems |
|---------|-----------------|
| 1D array | Climbing Stairs, House Robber, Coin Change |
| 2D grid | Unique Paths, Minimum Path Sum |
| Intervals | Burst Balloons, Matrix Chain |
| Strings | LCS, Edit Distance, Palindrome Partitioning |
| Knapsack | 0/1 Knapsack, Partition Equal Subset |

## Recipe
1. Define the subproblem: what does `dp[i]` represent?
2. Write the recurrence relation
3. Identify base cases
4. Decide order of computation (top-down or bottom-up)
5. Optimize space if possible

## Complexity
Depends on number of subproblems × work per subproblem. Often O(n), O(n²), or O(n·m).

## Classic Problems
- Climbing Stairs, Coin Change, Longest Common Subsequence, Edit Distance, 0/1 Knapsack
