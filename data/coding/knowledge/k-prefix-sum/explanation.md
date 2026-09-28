# Prefix Sum

A **prefix sum** (cumulative sum) array `pre` is built so that `pre[i]` holds the sum of `nums[0..i-1]`. This lets you answer any range sum query in **O(1)** after an **O(n)** build.

---

## 1D — Range Sum Query

```cpp
// Build — O(n)
vector<int> pre(nums.size() + 1, 0);
for (int i = 0; i < (int)nums.size(); i++)
    pre[i + 1] = pre[i] + nums[i];

// Query sum of nums[l..r] — O(1)
int rangeSum(int l, int r) { return pre[r + 1] - pre[l]; }
```

**Key:** index the prefix array with +1 offset so `pre[0] = 0`. Then `sum(l, r) = pre[r+1] - pre[l]` — no edge cases.

---

## Pattern 1 — Subarray sum equals K

Count subarrays with sum exactly `k`. A subarray `[l..r]` sums to `k` when `pre[r+1] - pre[l] = k`, i.e. `pre[l] = pre[r+1] - k`.

**Combine with a hash map** that counts how many times each prefix sum has appeared:

```cpp
int subarraySum(vector<int>& nums, int k) {
    unordered_map<int,int> cnt{{0, 1}};  // pre[0]=0 seen once
    int sum = 0, result = 0;
    for (int n : nums) {
        sum += n;
        result += cnt[sum - k];
        cnt[sum]++;
    }
    return result;
}
```

---

## Pattern 2 — Balance / equal halves

Replace each element with +1 or −1, then "equal count of X and Y" becomes "subarray sum = 0". Track the **first index** each running sum is seen:

```cpp
int maxBalanced(vector<int>& nums) {
    unordered_map<int,int> first{{0, -1}};
    int sum = 0, maxLen = 0;
    for (int i = 0; i < (int)nums.size(); i++) {
        sum += (nums[i] == 1) ? 1 : -1;
        if (first.count(sum))
            maxLen = max(maxLen, i - first[sum]);
        else
            first[sum] = i;   // only store FIRST occurrence
    }
    return maxLen;
}
```

---

## 2D Prefix Sum

```cpp
// Build
vector<vector<int>> P(m + 1, vector<int>(n + 1, 0));
for (int r = 1; r <= m; r++)
    for (int c = 1; c <= n; c++)
        P[r][c] = grid[r-1][c-1] + P[r-1][c] + P[r][c-1] - P[r-1][c-1];

// Query sum of submatrix [r1,c1]..[r2,c2] (1-indexed)
int query(int r1, int c1, int r2, int c2) {
    return P[r2][c2] - P[r1-1][c2] - P[r2][c1-1] + P[r1-1][c1-1];
}
```

---

## When to use prefix sum

| Signal | Apply |
|---|---|
| "sum of subarray from l to r" (multiple queries) | 1D prefix array |
| "number of subarrays summing to k" | prefix sum + hash map |
| "longest subarray with equal X and Y" | +1/−1 encoding + hash map |
| "sum of submatrix" | 2D prefix matrix |
| Range queries with no updates | prefix sum; use Fenwick tree if updates needed |

---

## Complexity

| | Time | Space |
|---|---|---|
| Build | O(n) | O(n) |
| Single range query | O(1) | — |
| Count subarrays = k | O(n) | O(n) for map |
