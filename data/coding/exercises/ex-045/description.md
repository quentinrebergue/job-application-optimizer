# Jump Game II

You are given an array `nums` of length `n`. Initially at index `0`, each `nums[i]` is the maximum forward jump from index `i`.

Return the **minimum number of jumps** to reach index `n - 1`. It is guaranteed you can reach it.

**Example 1:**
```
Input:  nums = [2,3,1,1,4]
Output: 2
Explanation: Jump to index 1 (1 step), then to index 4 (3 steps).
```

**Example 2:**
```
Input:  nums = [2,3,0,1,4]
Output: 2
```

**Constraints:**
- `1 <= nums.length <= 10⁴`
- `0 <= nums[i] <= 1000`
- It is guaranteed you can reach `nums[n - 1]`
