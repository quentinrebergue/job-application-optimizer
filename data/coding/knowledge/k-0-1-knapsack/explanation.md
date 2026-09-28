# 0/1 Knapsack

The knapsack family covers problems where you pick items to satisfy a constraint (weight, capacity, sum) while optimising a value. **0/1** means each item can be taken **at most once**.

---

## The core problem

Given `n` items each with a weight `w[i]` and value `v[i]`, and a knapsack of capacity `W`, maximise total value without exceeding `W`.

**Recurrence:** for each item `i` and capacity `j`:
```text
dp[i][j] = max(
  dp[i-1][j],            // skip item i
  dp[i-1][j-w[i]] + v[i] // take item i (if j >= w[i])
)
```

---

## 1D (space-optimised) template — the one you'll always write

Compress to a single array by iterating capacity **backwards** (prevents reusing the same item):

```cpp
int knapsack01(vector<int>& w, vector<int>& v, int W) {
    vector<int> dp(W + 1, 0);
    for (int i = 0; i < (int)w.size(); i++)
        for (int j = W; j >= w[i]; j--)   // ← backwards is the 0/1 key
            dp[j] = max(dp[j], dp[j - w[i]] + v[i]);
    return dp[W];
}
```

**Why backwards?** When you update `dp[j]`, you need `dp[j - w[i]]` from the **previous** item's row. Iterating right-to-left guarantees that value hasn't been overwritten yet for the current item.

---

## Subset-sum variant (boolean)

"Can we pick a subset that sums to exactly `target`?"

```cpp
bool canReachTarget(vector<int>& nums, int target) {
    vector<bool> dp(target + 1, false);
    dp[0] = true;
    for (int num : nums)
        for (int j = target; j >= num; j--)   // ← backwards
            dp[j] = dp[j] || dp[j - num];
    return dp[target];
}
```

**Example:** Partition Equal Subset Sum → `target = totalSum / 2`.

---

## Unbounded knapsack — coins / infinite supply

Each item can be used **any number of times**. Iterate **forwards**:

```cpp
int coinChange(vector<int>& coins, int amount) {
    vector<int> dp(amount + 1, INT_MAX);
    dp[0] = 0;
    for (int j = 1; j <= amount; j++)
        for (int c : coins)
            if (c <= j && dp[j - c] != INT_MAX)
                dp[j] = min(dp[j], dp[j - c] + 1);
    return dp[amount] == INT_MAX ? -1 : dp[amount];
}
```

| | 0/1 Knapsack | Unbounded Knapsack |
|---|---|---|
| Item reuse | At most once | Unlimited |
| Inner loop direction | **Backwards** ← | **Forwards** → |
| Examples | Partition subset, 0-1 scheduling | Coin change, rod cutting |

---

## Recognising knapsack problems

| Signal | Pattern |
|---|---|
| "partition into two equal subsets" | 0/1 subset-sum |
| "select items that sum to target" | 0/1 subset-sum |
| "minimum coins / minimum cuts" | Unbounded (minimize) |
| "each item used at most once" | 0/1 |
| "unlimited supply" | Unbounded |

---

## Complexity

| Variant | Time | Space (1D) |
|---|---|---|
| 0/1 knapsack | O(n × W) | O(W) |
| Unbounded knapsack | O(n × W) | O(W) |
